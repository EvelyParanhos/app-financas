package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.dto.InvestmentEntryDTO;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.InvestmentEntryType;
import com.evely.financas.model.Account;
import com.evely.financas.repository.AccountRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BalanceService {

    private final AccountRepository accountRepository;
    private final InvestmentService investmentService;
    private final AuditService auditService;

    public BigDecimal getSaldoAtual(Account conta) {
        if (conta.getType() == AccountType.INVESTMENT) {
            return investmentService.calcularSaldo(conta.getId());
        }
        return accountRepository.findById(conta.getId())
            .map(Account::getBalance)
            .orElse(BigDecimal.ZERO);
    }

    @Transactional
    public void baixarSaldo(Account conta, BigDecimal valor) {
        if (conta.getType() == AccountType.INVESTMENT) {
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

    @Transactional
    public void subirSaldo(Account conta, BigDecimal valor) {
        if (conta.getType() == AccountType.INVESTMENT) {
            throw new RuntimeException(
                "Para aportar em um investimento, use InvestmentService.lancarEntrada(DEPOSIT).");
        }
        accountRepository.incrementBalance(conta.getId(), valor);
    }

    /**
     * Transferência atômica entre duas contas com registro de auditoria.
     *
     * @param userId ID do usuário que executou a transferência (para o log).
     *               Passe null se chamado fora de contexto de usuário autenticado.
     */
    @Transactional
    public void transferir(Account origem, Account destino, BigDecimal valor, UUID userId) {
        baixarSaldo(origem, valor);
        if (destino.getType() == AccountType.INVESTMENT) {
            UUID operadorId = userId != null ? userId : origem.getOwner().getId();
            investmentService.lancarEntrada(new InvestmentEntryDTO(
                destino.getId(),
                InvestmentEntryType.DEPOSIT,
                valor,
                LocalDate.now(),
                "Transferencia de " + origem.getName()
            ), operadorId);
        } else {
            subirSaldo(destino, valor);
        }

        if (userId != null) {
            auditService.log(
                userId, "TRANSFER", "Account", origem.getId(),
                "Transferência de R$" + valor
                    + " de '" + origem.getName() + "' para '" + destino.getName() + "'",
                valor
            );
        }
    }

    /**
     * Sobrecarga sem userId — mantém compatibilidade com chamadas internas
     * que não têm contexto de usuário (ex: efetivarSimulacao via scheduler).
     */
    @Transactional
    public void transferir(Account origem, Account destino, BigDecimal valor) {
        transferir(origem, destino, valor, null);
    }

    public void validarSaldo(Account conta, BigDecimal valor) {
        BigDecimal saldoAtual = getSaldoAtual(conta);
        if (saldoAtual.compareTo(valor) < 0) {
            throw new RuntimeException(
                "Saldo insuficiente na conta: " + conta.getName() +
                ". Disponível: R$" + saldoAtual + ", necessário: R$" + valor);
        }
    }
}
