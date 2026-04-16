package com.evely.financas.service;

import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.enums.TransactionType;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Installment;
import com.evely.financas.model.User;
import com.evely.financas.repository.InstallmentRepository;
import com.evely.financas.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InstallmentService {

    private final InstallmentRepository installmentRepository;
    private final UserRepository userRepository;
    private final BalanceService balanceService;

    // InstallmentService.java — método pagarParcela completo

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

        if (tipo == TransactionType.INTERNAL_REPAYMENT) {
            // Auto-empréstimo: dinheiro volta da corrente para a reserva
            balanceService.transferir(
                parcela.getTransaction().getAccount(),
                parcela.getTransaction().getDestinationAccount(),
                parcela.getAmount()
            );
            return parcela;
        }

        // Parcela vinculada a fatura de cartão: o débito acontece no pagarFatura()
        // Não debitar duas vezes
        if (parcela.getInvoice() != null) {
            return parcela;
        }

        // Parcela comum (EXPENSE, LOAN_OUT): debita da conta da transação
        if (tipo == TransactionType.EXPENSE || tipo == TransactionType.LOAN_OUT) {
            balanceService.baixarSaldo(
                parcela.getTransaction().getAccount(),
                parcela.getAmount()
            );
        }

        return parcela;
    }

    @Transactional
    public void dividirParcela(UUID installmentId, BigDecimal valorPayer1, UUID idPayer2) {
        Installment original = installmentRepository.findById(installmentId)
            .orElseThrow(() -> new ObjectNotFoundException("Parcela não encontrada!"));

        BigDecimal valorTotalOriginal = original.getAmount();

        User payer2 = userRepository.findById(idPayer2)
            .orElseThrow(() -> new ObjectNotFoundException("Segundo pagador não encontrado!"));

        if (valorPayer1.compareTo(valorTotalOriginal) >= 0) {
            throw new RuntimeException(
                "O valor da divisão deve ser menor que o valor total da parcela!"
            );
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

        installmentRepository.save(original);
        installmentRepository.save(irma);
    }

    public void assumirParcelaTotal(UUID installmentId, UUID novoPayerId) {
        Installment parcela = installmentRepository.findById(installmentId)
            .orElseThrow(() -> new ObjectNotFoundException("Parcela não encontrada!"));

        User novoPagador = userRepository.findById(novoPayerId)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado!"));

        parcela.setPayer(novoPagador);
        installmentRepository.save(parcela);
    }
}