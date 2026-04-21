package com.evely.financas.service;

import java.math.BigDecimal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.enums.AccountType;
import com.evely.financas.model.Account;
import com.evely.financas.repository.AccountRepository;
import lombok.RequiredArgsConstructor;

/**
 * ✅ REESCRITO: BalanceService com updates atômicos no banco.
 *
 * Antes: usava tabela snapshots (leitura → cálculo → inserção)
 *        → race condition em requests concorrentes.
 *
 * Agora: queries UPDATE atômicas direto no banco
 *        → atomicidade garantida pelo BD, sem locks no Java.
 *
 * INVESTMENT accounts: não usam a coluna balance.
 * O saldo de investimentos é calculado em InvestmentService.calcularSaldo()
 * a partir dos lançamentos (InvestmentEntry), garantindo rastreabilidade completa.
 */
@Service
@RequiredArgsConstructor
public class BalanceService {

    private final AccountRepository accountRepository;
    private final InvestmentService investmentService;

    /**
     * Retorna o saldo atual da conta.
     * Para INVESTMENT: calcula a partir dos lançamentos (InvestmentEntry).
     * Para demais tipos: lê a coluna balance diretamente.
     */
    public BigDecimal getSaldoAtual(Account conta) {
        if (conta.getType() == AccountType.INVESTMENT) {
            return investmentService.calcularSaldo(conta.getId());
        }
        // Re-fetch para garantir que não estamos com dado stale em memória
        return accountRepository.findById(conta.getId())
            .map(Account::getBalance)
            .orElse(BigDecimal.ZERO);
    }

    /**
     * Debita o valor da conta.
     * A condição `balance >= valor` é verificada atomicamente no banco.
     * Lança RuntimeException se saldo insuficiente.
     */
    @Transactional
    public void baixarSaldo(Account conta, BigDecimal valor) {
        if (conta.getType() == AccountType.INVESTMENT) {
            // Investimentos não debitam via BalanceService
            // Use InvestmentService.lancarEntrada(WITHDRAWAL) para resgates
            throw new RuntimeException(
                "Para resgatar de um investimento, use InvestmentService.lancarEntrada(WITHDRAWAL).");
        }

        int rowsUpdated = accountRepository.decrementBalance(conta.getId(), valor);
        if (rowsUpdated == 0) {
            BigDecimal saldoAtual = getSaldoAtual(conta);
            throw new RuntimeException(
                "Saldo insuficiente na conta: " + conta.getName() +
                ". Disponível: R$" + saldoAtual + ", necessário: R$" + valor);
        }
    }

    /**
     * Credita o valor na conta.
     */
    @Transactional
    public void subirSaldo(Account conta, BigDecimal valor) {
        if (conta.getType() == AccountType.INVESTMENT) {
            throw new RuntimeException(
                "Para aportar em um investimento, use InvestmentService.lancarEntrada(DEPOSIT).");
        }
        accountRepository.incrementBalance(conta.getId(), valor);
    }

    /**
     * Transferência atômica entre duas contas.
     * Baixa a origem e sobe o destino na mesma transação.
     * Nenhuma das duas pode ser INVESTMENT — use os respectivos serviços.
     */
    @Transactional
    public void transferir(Account origem, Account destino, BigDecimal valor) {
        baixarSaldo(origem, valor);
        subirSaldo(destino, valor);
    }

    /**
     * Valida se a conta tem saldo suficiente sem efetuar o débito.
     * Útil para pré-validação antes de operações compostas.
     */
    public void validarSaldo(Account conta, BigDecimal valor) {
        BigDecimal saldoAtual = getSaldoAtual(conta);
        if (saldoAtual.compareTo(valor) < 0) {
            throw new RuntimeException(
                "Saldo insuficiente na conta: " + conta.getName() +
                ". Disponível: R$" + saldoAtual + ", necessário: R$" + valor);
        }
    }
}