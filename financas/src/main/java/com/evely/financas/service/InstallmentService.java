package com.evely.financas.service;

import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.enums.InvestmentEntryType;
import com.evely.financas.enums.TransactionType;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.Installment;
import com.evely.financas.model.InvestmentEntry;
import com.evely.financas.model.User;
import com.evely.financas.repository.InstallmentRepository;
import com.evely.financas.repository.InvestmentEntryRepository;
import com.evely.financas.repository.PartnershipRepository;
import com.evely.financas.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InstallmentService {

    private final InstallmentRepository installmentRepository;
    private final UserRepository userRepository;
    private final BalanceService balanceService;
    private final PartnershipRepository partnershipRepository;
    private final InvestmentEntryRepository investmentEntryRepository;
    private final AuditService auditService;

    @Transactional
    public Installment pagarParcela(UUID id, UUID userId) {
        Installment parcela = installmentRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Parcela não encontrada!"));

        if (parcela.getPayer() == null || !parcela.getPayer().getId().equals(userId)) {
            throw new RuntimeException("Sem permissao para pagar esta parcela.");
        }

        if (parcela.getStatus() == InstallmentStatus.PAID) {
            throw new RuntimeException("Esta parcela já foi paga.");
        }

        parcela.setStatus(InstallmentStatus.PAID);
        installmentRepository.save(parcela);

        TransactionType tipo = parcela.getTransaction().getType();
        Account conta = parcela.getTransaction().getAccount();

        if (tipo == TransactionType.INTERNAL_REPAYMENT) {
            Account destino = parcela.getTransaction().getDestinationAccount();

            balanceService.baixarSaldo(conta, parcela.getAmount());

            InvestmentEntry deposito = new InvestmentEntry();
            deposito.setAccount(destino);
            deposito.setType(InvestmentEntryType.DEPOSIT);
            deposito.setAmount(parcela.getAmount());
            deposito.setEntryDate(LocalDate.now());
            deposito.setNotes("Reposição auto-empréstimo — parcela " + parcela.getInstallmentNumber());
            investmentEntryRepository.save(deposito);

            auditService.log(
                parcela.getPayer().getId(),
                "INSTALLMENT_PAID",
                "Installment",
                parcela.getId(),
                "Reposição auto-empréstimo — parcela #" + parcela.getInstallmentNumber()
                    + " de '" + parcela.getTransaction().getDescription() + "'"
                    + " — R$" + parcela.getAmount(),
                parcela.getAmount()
            );

            return parcela;
        }

        if (parcela.getInvoice() != null) {
            // Cartão: só registra o log — débito acontece ao pagar a fatura
            auditService.log(
                parcela.getPayer().getId(),
                "INSTALLMENT_PAID",
                "Installment",
                parcela.getId(),
                "Parcela #" + parcela.getInstallmentNumber()
                    + " de '" + parcela.getTransaction().getDescription() + "'"
                    + " marcada como paga (fatura cartão) — R$" + parcela.getAmount(),
                parcela.getAmount()
            );
            return parcela;
        }

        switch (tipo) {
            case EXPENSE  -> balanceService.baixarSaldo(conta, parcela.getAmount());
            case INCOME   -> balanceService.subirSaldo(conta, parcela.getAmount());
            case LOAN_OUT -> balanceService.baixarSaldo(conta, parcela.getAmount());
            default -> { /* TRANSFER: executado no registro */ }
        }

        auditService.log(
            parcela.getPayer().getId(),
            "INSTALLMENT_PAID",
            "Installment",
            parcela.getId(),
            "Parcela #" + parcela.getInstallmentNumber()
                + " de '" + parcela.getTransaction().getDescription() + "' paga"
                + " — R$" + parcela.getAmount(),
            parcela.getAmount()
        );

        return parcela;
    }

    @Transactional
    public void dividirParcela(UUID installmentId, BigDecimal valorPayer1,
                               UUID idPayer2, UUID userId) {
        Installment original = installmentRepository.findById(installmentId)
            .orElseThrow(() -> new ObjectNotFoundException("Parcela não encontrada!"));

        validarAcessoParcela(original, userId);

        if (original.getStatus() == InstallmentStatus.PAID) {
            throw new RuntimeException("Não é possível dividir uma parcela já paga.");
        }

        validarPartnership(userId, idPayer2);

        BigDecimal valorTotalOriginal = original.getAmount();
        User payer2 = userRepository.findById(idPayer2)
            .orElseThrow(() -> new ObjectNotFoundException("Segundo pagador não encontrado!"));

        if (valorPayer1.compareTo(BigDecimal.ZERO) <= 0
                || valorPayer1.compareTo(valorTotalOriginal) >= 0) {
            throw new RuntimeException(
                "O valor da divisão deve ser maior que zero e menor que o valor total.");
        }

        BigDecimal valorPayer2 = valorTotalOriginal.subtract(valorPayer1);
        original.setAmount(valorPayer1);

        Installment irma = new Installment();
        irma.setTransaction(original.getTransaction());
        irma.setInstallmentNumber(original.getInstallmentNumber());
        irma.setDueDate(original.getDueDate());
        irma.setStatus(original.getStatus());
        irma.setAmount(valorPayer2);
        irma.setPayer(payer2);
        irma.setInvoice(original.getInvoice());

        installmentRepository.save(original);
        installmentRepository.save(irma);
    }

    @Transactional
    public void assumirParcelaTotal(UUID installmentId, UUID novoPayerId, UUID userId) {
        Installment parcela = installmentRepository.findById(installmentId)
            .orElseThrow(() -> new ObjectNotFoundException("Parcela não encontrada!"));

        validarAcessoParcela(parcela, userId);

        if (parcela.getStatus() == InstallmentStatus.PAID) {
            throw new RuntimeException("Não é possível alterar o pagador de uma parcela já paga.");
        }

        validarPartnership(userId, novoPayerId);

        User novoPagador = userRepository.findById(novoPayerId)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado!"));

        parcela.setPayer(novoPagador);
        installmentRepository.save(parcela);
    }

    private void validarAcessoParcela(Installment parcela, UUID userId) {
        if (parcela.getPayer() != null && parcela.getPayer().getId().equals(userId)) {
            return;
        }

        if (parcela.getPayer() != null) {
            validarPartnership(userId, parcela.getPayer().getId());
            return;
        }

        Account conta = parcela.getTransaction() != null
            ? parcela.getTransaction().getAccount()
            : null;
        if (conta != null && conta.getOwner() != null && conta.getOwner().getId().equals(userId)) {
            return;
        }

        throw new RuntimeException("Sem permissao para alterar esta parcela.");
    }

    private void validarPartnership(UUID userId, UUID outroUserId) {
        boolean saoParceiroS = partnershipRepository.findByUserId(userId)
            .map(p -> p.getUserA().getId().equals(outroUserId)
                   || p.getUserB().getId().equals(outroUserId))
            .orElse(false);

        if (!saoParceiroS) {
            throw new RuntimeException(
                "Divisão e troca de pagador são permitidas apenas entre parceiros conectados (RN07).");
        }
    }
}
