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

    // ----------------------------------------------------------------
    // RN01 — Efeito de Liquidação
    // ----------------------------------------------------------------
    @Transactional
    public Installment pagarParcela(UUID id) {
        Installment parcela = installmentRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Parcela não encontrada!"));

        if (parcela.getStatus() == InstallmentStatus.PAID) {
            throw new RuntimeException("Esta parcela já foi paga.");
        }

        parcela.setStatus(InstallmentStatus.PAID);
        installmentRepository.save(parcela);

        TransactionType tipo = parcela.getTransaction().getType();
        Account conta = parcela.getTransaction().getAccount();

        // ----------------------------------------------------------------
        // INTERNAL_REPAYMENT — Reposição do auto-empréstimo (RN11)
        //
        // O dinheiro sai da conta corrente (onde foi "gasto" o empréstimo)
        // e volta para o investimento que foi "emprestado".
        //
        // ✅ FIX: Além de transferir, cria InvestmentEntry DEPOSIT para
        //    manter o histórico correto do investimento.
        // ----------------------------------------------------------------
        if (tipo == TransactionType.INTERNAL_REPAYMENT) {
            Account destino = parcela.getTransaction().getDestinationAccount();

            // Debita da conta corrente
            balanceService.baixarSaldo(conta, parcela.getAmount());

            // Cria o lançamento de retorno no investimento
            InvestmentEntry deposito = new InvestmentEntry();
            deposito.setAccount(destino);
            deposito.setType(InvestmentEntryType.DEPOSIT);
            deposito.setAmount(parcela.getAmount());
            deposito.setEntryDate(LocalDate.now());
            deposito.setNotes("Reposição auto-empréstimo — parcela " + parcela.getInstallmentNumber());
            investmentEntryRepository.save(deposito);

            return parcela;
        }

        // ----------------------------------------------------------------
        // Parcela de cartão de crédito (RN02)
        // O débito no saldo bancário acontece quando a FATURA é paga,
        // não quando a parcela é marcada como PAGA. Aqui só rastreamos.
        // ----------------------------------------------------------------
        if (parcela.getInvoice() != null) {
            return parcela;
        }

        // ----------------------------------------------------------------
        // RN01 — Conta corrente / carteira
        // EXPENSE: debita
        // INCOME:  credita
        // LOAN_OUT: debita (o dinheiro saiu para o terceiro)
        // ----------------------------------------------------------------
        switch (tipo) {
            case EXPENSE  -> balanceService.baixarSaldo(conta, parcela.getAmount());
            case INCOME   -> balanceService.subirSaldo(conta, parcela.getAmount());
            case LOAN_OUT -> balanceService.baixarSaldo(conta, parcela.getAmount());
            default -> {
                // TRANSFER: executado no momento do registro — não age aqui
            }
        }

        return parcela;
    }

    // ----------------------------------------------------------------
    // RN06 — Divisão Híbrida
    // ✅ RN07: Valida que ambos fazem parte da mesma partnership
    // ----------------------------------------------------------------
    @Transactional
    public void dividirParcela(UUID installmentId, BigDecimal valorPayer1, UUID idPayer2, UUID userId) {
        Installment original = installmentRepository.findById(installmentId)
            .orElseThrow(() -> new ObjectNotFoundException("Parcela não encontrada!"));

        if (original.getStatus() == InstallmentStatus.PAID) {
            throw new RuntimeException("Não é possível dividir uma parcela já paga.");
        }

        // ✅ RN07: Valida partnership
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
        irma.setInvoice(original.getInvoice()); // herda a fatura

        installmentRepository.save(original);
        installmentRepository.save(irma);
    }

    // ----------------------------------------------------------------
    // RN05 — Troca Dinâmica de Pagador
    // ✅ RN07: Valida partnership
    // ----------------------------------------------------------------
    @Transactional
    public void assumirParcelaTotal(UUID installmentId, UUID novoPayerId, UUID userId) {
        Installment parcela = installmentRepository.findById(installmentId)
            .orElseThrow(() -> new ObjectNotFoundException("Parcela não encontrada!"));

        if (parcela.getStatus() == InstallmentStatus.PAID) {
            throw new RuntimeException("Não é possível alterar o pagador de uma parcela já paga.");
        }

        // ✅ RN07: Valida partnership
        validarPartnership(userId, novoPayerId);

        User novoPagador = userRepository.findById(novoPayerId)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado!"));

        parcela.setPayer(novoPagador);
        installmentRepository.save(parcela);
    }

    // ----------------------------------------------------------------
    // Validação de partnership (RN07)
    // ----------------------------------------------------------------
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