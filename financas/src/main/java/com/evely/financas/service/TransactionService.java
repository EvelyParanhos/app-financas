package com.evely.financas.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.enums.TransactionType;
import com.evely.financas.enums.UserStatus;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.CreditCardInvoice;
import com.evely.financas.model.Installment;
import com.evely.financas.model.Transaction;
import com.evely.financas.model.User;
import com.evely.financas.repository.InstallmentRepository;
import com.evely.financas.repository.TransactionRepository;
import com.evely.financas.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final InstallmentRepository installmentRepository;
    private final UserRepository userRepository;
    private final BalanceService balanceService;
    private final CreditCardInvoiceService creditCardInvoiceService;

    @Transactional
    public Transaction registrarTransacao(Transaction transacao, int totalParcelas, UUID userId) {
        User pagador = userRepository.findById(userId)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado!"));

        // Apenas usuários ativos podem registrar transações reais
        if (!transacao.isSimulation() && !pagador.getStatus().equals(UserStatus.ACTIVE)) {
            throw new RuntimeException("Sua conta precisa estar ATIVA para registrar gastos reais.");
        }

        // Validação antecipada para TRANSFER
        if (transacao.getType() == TransactionType.TRANSFER
                && transacao.getDestinationAccount() == null) {
            throw new RuntimeException("Transferência exige uma conta de destino.");
        }

        boolean ehCartao = transacao.getAccount().getType() == AccountType.CREDIT_CARD;

        BigDecimal valorParcela = transacao.getTotalAmount()
            .divide(BigDecimal.valueOf(totalParcelas), 2, RoundingMode.HALF_UP);

        // Resolve mês base da primeira parcela
        LocalDate dataBase = transacao.getPurchaseDate() != null
            ? transacao.getPurchaseDate()
            : LocalDate.now();

        LocalDate mesBase = ehCartao
            ? creditCardInvoiceService
                .resolverMesDaPrimeiraParcela(transacao.getAccount(), dataBase)
                .withDayOfMonth(1)
            : dataBase;

        for (int i = 0; i < totalParcelas; i++) {
            Installment parcela = new Installment();
            parcela.setInstallmentNumber(i + 1);
            parcela.setStatus(InstallmentStatus.PENDING);
            parcela.setTransaction(transacao);
            parcela.setAmount(valorParcela);
            parcela.setPayer(pagador);

            if (ehCartao) {
                LocalDate mesDaParcela = mesBase.plusMonths(i);
                parcela.setDueDate(
                    mesDaParcela.withDayOfMonth(transacao.getAccount().getDueDay())
                );

                // Fatura só é criada para transações reais
                if (!transacao.isSimulation()) {
                    CreditCardInvoice invoice = creditCardInvoiceService.buscarOuCriarFatura(
                        transacao.getAccount(),
                        mesDaParcela.getMonthValue(),
                        mesDaParcela.getYear()
                    );
                    creditCardInvoiceService.adicionarValorNaFatura(invoice, valorParcela);
                    parcela.setInvoice(invoice);
                }
            } else {
                parcela.setDueDate(mesBase.plusMonths(i));
            }

            transacao.getInstallments().add(parcela);
        }

        Transaction transacaoSalva = transactionRepository.save(transacao);

        // Movimentação de saldo — apenas transações reais
        if (!transacaoSalva.isSimulation()) {
            if (ehCartao) {
                // Cartão: baixa o limite total imediatamente
                balanceService.baixarSaldo(
                    transacaoSalva.getAccount(),
                    transacaoSalva.getTotalAmount()
                );
            } else {
                atualizarSaldoAutomatico(transacaoSalva);
            }
        }

        return transacaoSalva;
    }

    @Transactional
    public void efetivarSimulacao(UUID transactionId) {
        Transaction transacao = transactionRepository.findById(transactionId)
            .orElseThrow(() -> new ObjectNotFoundException("Simulação não encontrada!"));

        if (!transacao.isSimulation()) {
            throw new RuntimeException("Esta transação já é real!");
        }

        boolean ehCartao = transacao.getAccount().getType() == AccountType.CREDIT_CARD;

        // Torna a transação oficial
        transacao.setSimulation(false);

        if (ehCartao) {
            // Valida se o limite ainda comporta o valor (pode ter mudado desde a simulação)
            balanceService.validarSaldo(transacao.getAccount(), transacao.getTotalAmount());

            // Cria as faturas e vincula as parcelas — o que não foi feito na simulação
            for (Installment parcela : transacao.getInstallments()) {
                LocalDate mesDaParcela = parcela.getDueDate().withDayOfMonth(1);
                CreditCardInvoice invoice = creditCardInvoiceService.buscarOuCriarFatura(
                    transacao.getAccount(),
                    mesDaParcela.getMonthValue(),
                    mesDaParcela.getYear()
                );
                creditCardInvoiceService.adicionarValorNaFatura(invoice, parcela.getAmount());
                parcela.setInvoice(invoice);
                installmentRepository.save(parcela);
            }

            // Baixa o limite após criar as faturas
            balanceService.baixarSaldo(
                transacao.getAccount(),
                transacao.getTotalAmount()
            );
        } else {
            atualizarSaldoAutomatico(transacao);
        }

        transactionRepository.save(transacao);
    }


    public void excluir(UUID id) {
        Transaction transaction = transactionRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Transação não encontrada!"));

        boolean temParcelaPaga = installmentRepository
            .existeParcellaPagaParaTransacao(id);

        if (temParcelaPaga) {
            throw new RuntimeException(
                "Não é possível excluir esta transação pois já existem parcelas pagas. " +
                "Para desfazer, registre um estorno."
            );
        }

    // Todas pendentes — cascade cuida das installments (orphanRemoval = true)
    transactionRepository.delete(transaction);
}
    private void atualizarSaldoAutomatico(Transaction transacao) {
        switch (transacao.getType()) {
            case INCOME -> balanceService.subirSaldo(
                transacao.getAccount(), transacao.getTotalAmount()
            );
            case TRANSFER -> balanceService.transferir(
                transacao.getAccount(),
                transacao.getDestinationAccount(),
                transacao.getTotalAmount()
            );
            // EXPENSE, LOAN_OUT, INTERNAL_REPAYMENT — todos baixam saldo
            default -> balanceService.baixarSaldo(
                transacao.getAccount(), transacao.getTotalAmount()
            );
        }
    }
}