package com.evely.financas.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import com.evely.financas.repository.TransactionRepository;
import com.evely.financas.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.enums.TransactionType;
import com.evely.financas.model.Account;
import com.evely.financas.model.Installment;
import com.evely.financas.model.Snapshot;
import com.evely.financas.model.Transaction;
import com.evely.financas.model.User;
import com.evely.financas.repository.InstallmentRepository;
import com.evely.financas.repository.SnapshotRepository; 

@Service
@RequiredArgsConstructor
public class TransactionService {
    private final TransactionRepository transactionRepository;
    private final InstallmentRepository installmentRepository;
    private final UserRepository userRepository;
    private final SnapshotRepository snapshotRepository;

    @Transactional
    public Transaction registrarTransacao (Transaction transacao, int totalParcelas, String telegramId) {
        User pagador = userRepository.findByTelegramId(telegramId)
            .orElseThrow(() -> new RuntimeException("Usuário do Telegram não cadastrado!"));

        BigDecimal valorParcela = transacao.getTotalAmount().divide(BigDecimal.valueOf(totalParcelas), 2, RoundingMode.HALF_UP);

        for (int i=1; i <= totalParcelas; i++) {
            Installment parcela = new Installment();
            parcela.setInstallmentNumber(i);
            parcela.setStatus(InstallmentStatus.PENDING);
            parcela.setTransaction(transacao);
            parcela.setAmount(valorParcela);
            parcela.setDueDate(transacao.getPurchaseDate().plusMonths(i));
            parcela.setPayer(pagador);

            transacao.getInstallments().add(parcela);
        }

        Transaction transacaoSalva = transactionRepository.save(transacao);

        if (transacaoSalva.getAccount().getType() != AccountType.CREDIT_CARD) {
            atualizarSaldoAutomatico(transacaoSalva);
        } 

        return transacaoSalva;
    }
    private void processarMovimentacao(Account conta, BigDecimal valor, String direcao) {
        BigDecimal saldoAnterior = snapshotRepository.findFirstByAccountOrderBySnapshotDateDesc(conta)
            .map(Snapshot::getAmount)
            .orElse(BigDecimal.ZERO);

        BigDecimal novoSaldo = direcao.equals("SAIDA") 
        ? saldoAnterior.subtract(valor) 
        : saldoAnterior.add(valor);

        Snapshot novoSnapshot = new Snapshot();
        novoSnapshot.setAccount(conta);
        novoSnapshot.setAmount(novoSaldo);
        novoSnapshot.setSnapshotDate(LocalDateTime.now());
        snapshotRepository.save(novoSnapshot);
    }

    public void excluir(Integer id) {
    Transaction transaction = transactionRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Transação não encontrada!"));
    transactionRepository.delete(transaction);
    }

    private void atualizarSaldoAutomatico(Transaction transacao) {
        String direcaoOrigem = (transacao.getType() == TransactionType.INCOME) ? "ENTRADA" : "SAIDA";
        processarMovimentacao(transacao.getAccount(), transacao.getTotalAmount(), direcaoOrigem);

        if (transacao.getType() == TransactionType.TRANSFER && transacao.getDestinationAccount() != null) {
            processarMovimentacao(transacao.getDestinationAccount(), transacao.getTotalAmount(), "ENTRADA");
        }
    }
}
