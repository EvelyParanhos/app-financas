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
import com.evely.financas.repository.AccountRepository;
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
    private final AccountRepository accountRepository;
    private final CreditCardInvoiceService creditCardInvoiceService;

    @Transactional
    public Transaction registrarTransacao(Transaction transacao, int totalParcelas, UUID userId) {
        Account conta = accountRepository.findById(transacao.getAccount().getId())
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));
        transacao.setAccount(conta);

        boolean ehCartao = conta.getType() == AccountType.CREDIT_CARD;
        User pagador = userRepository.findById(userId)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado"));

        if (!transacao.isSimulation() && !pagador.getStatus().equals(UserStatus.ACTIVE)) {
            throw new RuntimeException(
                "Sua conta precisa estar ATIVA para registrar gastos reais.");
        }

        if (transacao.getType() == TransactionType.TRANSFER
                && transacao.getDestinationAccount() == null) {
            throw new RuntimeException("Transferência exige uma conta de destino.");
        }

        BigDecimal valorParcela = transacao.getTotalAmount()
            .divide(BigDecimal.valueOf(totalParcelas), 2, RoundingMode.HALF_UP);

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

        // ----------------------------------------------------------------
        // RN01 — Regra de Efeito de Liquidação
        //
        // CREDIT_CARD: baixa o limite disponível do cartão imediatamente.
        // TRANSFER:    move saldo entre contas imediatamente.
        //
        // EXPENSE / INCOME em conta corrente ou carteira:
        //   O saldo SÓ muda quando a parcela for marcada como PAGA
        //   pelo usuário no checklist (pagarParcela).
        //   Isso aplica tanto para pagamentos à vista quanto parcelados,
        //   garantindo que o checklist seja a única fonte de verdade.
        // ----------------------------------------------------------------
        if (!transacaoSalva.isSimulation()) {
            if (ehCartao) {
                balanceService.baixarSaldo(
                    transacaoSalva.getAccount(),
                    transacaoSalva.getTotalAmount()
                );
            } else if (transacaoSalva.getType() == TransactionType.TRANSFER) {
                balanceService.transferir(
                    transacaoSalva.getAccount(),
                    transacaoSalva.getDestinationAccount(),
                    transacaoSalva.getTotalAmount()
                );
            }
            // Para EXPENSE, INCOME e LOAN_OUT em conta corrente/carteira:
            // parcelas ficam PENDING → saldo atualiza quando marcadas como pagas.
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

        Account conta = accountRepository.findById(transacao.getAccount().getId())
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));
        transacao.setAccount(conta);

        boolean ehCartao = conta.getType() == AccountType.CREDIT_CARD;
        transacao.setSimulation(false);

        if (ehCartao) {
            balanceService.validarSaldo(transacao.getAccount(), transacao.getTotalAmount());
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
            balanceService.baixarSaldo(transacao.getAccount(), transacao.getTotalAmount());

        } else if (transacao.getType() == TransactionType.TRANSFER) {
            balanceService.transferir(
                transacao.getAccount(),
                transacao.getDestinationAccount(),
                transacao.getTotalAmount()
            );
        }
        // Para EXPENSE/INCOME parcelados: saldo muda quando cada parcela for paga

        transactionRepository.save(transacao);
    }

    @Transactional
    public void excluir(UUID id, UUID userId) {
        Transaction transaction = transactionRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Transação não encontrada!"));

        if (!transaction.getAccount().getOwner().getId().equals(userId)) {
            throw new RuntimeException("Sem permissão para excluir esta transação.");
        }

        boolean temParcelaPaga = installmentRepository
            .existeParcellaPagaParaTransacao(id);

        if (temParcelaPaga) {
            throw new RuntimeException(
                "Não é possível excluir esta transação pois já existem parcelas pagas. " +
                "Para desfazer, registre um estorno.");
        }

        transactionRepository.delete(transaction);
    }
}