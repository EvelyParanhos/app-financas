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

        if (!transacao.isSimulation() && !pagador.getStatus().equals(UserStatus.ACTIVE)) {
            throw new RuntimeException(
                "Sua conta precisa estar ATIVA para registrar gastos reais.");
        }

        if (transacao.getType() == TransactionType.TRANSFER
                && transacao.getDestinationAccount() == null) {
            throw new RuntimeException("Transferência exige uma conta de destino.");
        }

        boolean ehCartao = transacao.getAccount().getType() == AccountType.CREDIT_CARD;

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
        // Apenas TRANSFER e compras em CARTÃO afetam o saldo imediatamente.
        //
        // - TRANSFER: o dinheiro sai e entra nas contas na hora (RN03).
        // - CREDIT_CARD: baixa o limite disponível do cartão na hora,
        //   mas NÃO afeta o saldo bancário (RN02). O saldo bancário só
        //   é afetado quando a fatura é paga (pagarFatura).
        // - EXPENSE / INCOME em conta corrente ou carteira: o saldo só
        //   muda quando a parcela é marcada como PAGA (pagarParcela).
        //   Isso representa boletos, contas e recebimentos futuros.
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
            // EXPENSE e INCOME: saldo afetado apenas em pagarParcela()
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

            balanceService.baixarSaldo(
                transacao.getAccount(),
                transacao.getTotalAmount()
            );
        } else if (transacao.getType() == TransactionType.TRANSFER) {
            // Transferência: executa imediatamente ao efetivar
            balanceService.transferir(
                transacao.getAccount(),
                transacao.getDestinationAccount(),
                transacao.getTotalAmount()
            );
        }
        // EXPENSE / INCOME: saldo afetado apenas quando a parcela for paga

        transactionRepository.save(transacao);
    }

    @Transactional
    public void excluir(UUID id, UUID userId) {
        Transaction transaction = transactionRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Transação não encontrada!"));

        // Segurança: apenas o dono da conta pode excluir
        if (!transaction.getAccount().getOwner().getId().equals(userId)) {
            throw new RuntimeException(
                "Sem permissão para excluir esta transação.");
        }

        // RN12 — Bloqueio de eliminação com histórico
        boolean temParcelaPaga = installmentRepository
            .existeParcellaPagaParaTransacao(id);

        if (temParcelaPaga) {
            throw new RuntimeException(
                "Não é possível excluir esta transação pois já existem parcelas pagas. " +
                "Para desfazer, registre um estorno.");
        }

        // RN13 — Eliminação em cascata limpa (cascade + orphanRemoval cuida das parcelas)
        transactionRepository.delete(transaction);
    }
}