package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.enums.AccountType;
import com.evely.financas.model.Account;
import com.evely.financas.model.Snapshot;
import com.evely.financas.repository.SnapshotRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BalanceService {

    private final SnapshotRepository snapshotRepository;
    private final InvestmentService investmentService;

    public BigDecimal getSaldoAtual(Account conta) {
        if (conta.getType() == AccountType.INVESTMENT) {
            return investmentService.calcularSaldo(conta.getId());
        }
        return snapshotRepository
            .findFirstByAccountOrderBySnapshotDateDesc(conta)
            .map(Snapshot::getAmount)
            .orElse(BigDecimal.ZERO);
    }

    @Transactional
    public void baixarSaldo(Account conta, BigDecimal valor) {
        BigDecimal saldoAtual = getSaldoAtual(conta);

        if (saldoAtual.compareTo(valor) < 0) {
            throw new RuntimeException(
                "Saldo insuficiente na conta: " + conta.getName() +
                ". Disponível: R$" + saldoAtual + ", necessário: R$" + valor
            );
        }

        salvarSnapshot(conta, saldoAtual.subtract(valor));
    }

 
    @Transactional
    public void subirSaldo(Account conta, BigDecimal valor) {
        BigDecimal saldoAtual = getSaldoAtual(conta);
        salvarSnapshot(conta, saldoAtual.add(valor));
    }

    @Transactional
    public void transferir(Account origem, Account destino, BigDecimal valor) {
        baixarSaldo(origem, valor);
        subirSaldo(destino, valor);
    }

 
    public void validarSaldo(Account conta, BigDecimal valor) {
        BigDecimal saldoAtual = getSaldoAtual(conta);
        if (saldoAtual.compareTo(valor) < 0) {
            throw new RuntimeException(
                "Saldo insuficiente na conta: " + conta.getName() +
                ". Disponível: R$" + saldoAtual + ", necessário: R$" + valor
            );
        }
    }
    
    private void salvarSnapshot(Account conta, BigDecimal novoSaldo) {
        Snapshot snapshot = new Snapshot();
        snapshot.setAccount(conta);
        snapshot.setAmount(novoSaldo);
        snapshot.setSnapshotDate(LocalDateTime.now());
        snapshotRepository.save(snapshot);
    }
}