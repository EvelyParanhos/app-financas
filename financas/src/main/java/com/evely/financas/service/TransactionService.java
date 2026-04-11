package com.evely.financas.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.evely.financas.repository.TransactionRepository;
import com.evely.financas.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.enums.TransactionType;
import com.evely.financas.enums.UserStatus;
import com.evely.financas.exception.ObjectNotFoundException;
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
    public Transaction registrarTransacao(Transaction transacao, int totalParcelas, UUID userId) {
        User pagador = userRepository.findById(userId)
                .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado!"));

        // Proteção: Só usuários ativos podem registrar gastos reais
        if (!transacao.isSimulation() && !pagador.getStatus().equals(UserStatus.ACTIVE)) {
            throw new ObjectNotFoundException("Sua conta precisa estar ATIVA para registrar gastos reais.");
        }

        BigDecimal valorParcela = transacao.getTotalAmount()
                .divide(BigDecimal.valueOf(totalParcelas), 2, RoundingMode.HALF_UP);

        for (int i = 1; i <= totalParcelas; i++) {
            Installment parcela = new Installment();
            parcela.setInstallmentNumber(i);
            parcela.setStatus(InstallmentStatus.PENDING);
            parcela.setTransaction(transacao);
            parcela.setAmount(valorParcela);
            
            LocalDate dataBase = transacao.getPurchaseDate() != null ? transacao.getPurchaseDate() : LocalDate.now();
            parcela.setDueDate(dataBase.plusMonths(i - 1)); 
            
            parcela.setPayer(pagador);
            transacao.getInstallments().add(parcela);
        }

        Transaction transacaoSalva = transactionRepository.save(transacao);

        if (!transacaoSalva.isSimulation()) {
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

        if (novoSaldo.compareTo(BigDecimal.ZERO) < 0) {
        String mensagem = (conta.getType() == AccountType.CREDIT_CARD) 
            ? "Cartão recusado: Limite insuficiente!" 
            : "Operação cancelada: Saldo insuficiente!";
        throw new ObjectNotFoundException(mensagem);
        }

        Snapshot novoSnapshot = new Snapshot();
        novoSnapshot.setAccount(conta);
        novoSnapshot.setAmount(novoSaldo);
        novoSnapshot.setSnapshotDate(LocalDateTime.now());
        snapshotRepository.save(novoSnapshot);
    }

    public void excluir(UUID id) {
    Transaction transaction = transactionRepository.findById(id)
        .orElseThrow(() -> new ObjectNotFoundException("Transação não encontrada!"));
    transactionRepository.delete(transaction);
    }

    private void atualizarSaldoAutomatico(Transaction transacao) {
        String direcaoOrigem = (transacao.getType() == TransactionType.INCOME) ? "ENTRADA" : "SAIDA";
        processarMovimentacao(transacao.getAccount(), transacao.getTotalAmount(), direcaoOrigem);

        if (transacao.getType() == TransactionType.TRANSFER && transacao.getDestinationAccount() != null) {
            processarMovimentacao(transacao.getDestinationAccount(), transacao.getTotalAmount(), "ENTRADA");
        }
    }

    @Transactional
    public void efetivarSimulacao(UUID transactionId) {
        Transaction transacao = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ObjectNotFoundException("Simulação não encontrada!"));

        if (!transacao.isSimulation()) {
            throw new ObjectNotFoundException("Esta transação já é real!");
        }

        // Torna a transação oficial
        transacao.setSimulation(false);
        
        // Aciona o gatilho de saldo (Snapshot) 
        if (transacao.getAccount().getType() != AccountType.CREDIT_CARD) {
            atualizarSaldoAutomatico(transacao);
        }

        transactionRepository.save(transacao);
    }
}
