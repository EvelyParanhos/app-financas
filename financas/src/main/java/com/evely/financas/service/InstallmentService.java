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

        // ----------------------------------------------------------------
        // INTERNAL_REPAYMENT — Auto-empréstimo (RN10)
        // O dinheiro sai da conta corrente (onde foi gasto) e volta para
        // o fundo de investimento que foi "emprestado".
        // ----------------------------------------------------------------
        if (tipo == TransactionType.INTERNAL_REPAYMENT) {
            balanceService.transferir(
                parcela.getTransaction().getAccount(),
                parcela.getTransaction().getDestinationAccount(),
                parcela.getAmount()
            );
            return parcela;
        }

        // ----------------------------------------------------------------
        // Parcela vinculada a fatura de cartão de crédito (RN02)
        // O débito no saldo bancário acontece quando a fatura é paga
        // via pagarFatura(), não aqui. O marcador PAID serve apenas
        // para rastreamento de responsabilidade (quem pagou sua parte).
        // ----------------------------------------------------------------
        if (parcela.getInvoice() != null) {
            return parcela;
        }

        // ----------------------------------------------------------------
        // RN01 — Efeito de Liquidação para contas correntes/carteiras
        //
        // EXPENSE: debita o valor da conta da transação.
        // INCOME:  credita o valor na conta da transação.
        // LOAN_OUT: debita (o dinheiro saiu para o terceiro).
        //
        // É aqui que o saldo "real" muda de fato, parcela por parcela.
        // ----------------------------------------------------------------
        switch (tipo) {
            case EXPENSE -> balanceService.baixarSaldo(
                parcela.getTransaction().getAccount(),
                parcela.getAmount()
            );
            case INCOME -> balanceService.subirSaldo(
                parcela.getTransaction().getAccount(),
                parcela.getAmount()
            );
            case LOAN_OUT -> balanceService.baixarSaldo(
                parcela.getTransaction().getAccount(),
                parcela.getAmount()
            );
            default -> {
                // TRANSFER: foi executado no momento do registro — não age aqui.
            }
        }

        return parcela;
    }

    // ----------------------------------------------------------------
    // RN06 — Divisão Híbrida
    //
    // Divide uma parcela entre dois pagadores. Funciona também para
    // parcelas de cartão de crédito (ambas herdam a mesma fatura).
    // A fatura não muda de total — apenas o rastreamento interno de
    // responsabilidade é dividido.
    //
    // Exemplo: parcela de R$ 500 da TV → 250 para cada cônjuge,
    // ambas apontando para a mesma CreditCardInvoice.
    // ----------------------------------------------------------------
    @Transactional
    public void dividirParcela(UUID installmentId, BigDecimal valorPayer1, UUID idPayer2) {
        Installment original = installmentRepository.findById(installmentId)
            .orElseThrow(() -> new ObjectNotFoundException("Parcela não encontrada!"));

        if (original.getStatus() == InstallmentStatus.PAID) {
            throw new RuntimeException(
                "Não é possível dividir uma parcela já paga.");
        }

        BigDecimal valorTotalOriginal = original.getAmount();

        User payer2 = userRepository.findById(idPayer2)
            .orElseThrow(() -> new ObjectNotFoundException(
                "Segundo pagador não encontrado!"));

        if (valorPayer1.compareTo(BigDecimal.ZERO) <= 0
                || valorPayer1.compareTo(valorTotalOriginal) >= 0) {
            throw new RuntimeException(
                "O valor da divisão deve ser maior que zero " +
                "e menor que o valor total da parcela!");
        }

        BigDecimal valorPayer2 = valorTotalOriginal.subtract(valorPayer1);

        // Ajusta a parcela original para o valor do primeiro pagador
        original.setAmount(valorPayer1);

        // Cria a parcela "irmã" para o segundo pagador
        Installment irma = new Installment();
        irma.setTransaction(original.getTransaction());
        irma.setInstallmentNumber(original.getInstallmentNumber());
        irma.setDueDate(original.getDueDate());
        irma.setStatus(original.getStatus());
        irma.setAmount(valorPayer2);
        irma.setPayer(payer2);

        // Herda a fatura de cartão, se existir (RN06 + RN02)
        // A fatura não muda de total — só o rastreamento interno muda.
        irma.setInvoice(original.getInvoice());

        installmentRepository.save(original);
        installmentRepository.save(irma);
    }

    // ----------------------------------------------------------------
    // RN05 — Troca Dinâmica de Pagador
    //
    // Um cônjuge assume 100% de uma parcela pendente do outro.
    // Não afeta as outras parcelas da mesma compra.
    // ----------------------------------------------------------------
    @Transactional
    public void assumirParcelaTotal(UUID installmentId, UUID novoPayerId) {
        Installment parcela = installmentRepository.findById(installmentId)
            .orElseThrow(() -> new ObjectNotFoundException("Parcela não encontrada!"));

        if (parcela.getStatus() == InstallmentStatus.PAID) {
            throw new RuntimeException(
                "Não é possível alterar o pagador de uma parcela já paga.");
        }

        User novoPagador = userRepository.findById(novoPayerId)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado!"));

        parcela.setPayer(novoPagador);
        installmentRepository.save(parcela);
    }
}