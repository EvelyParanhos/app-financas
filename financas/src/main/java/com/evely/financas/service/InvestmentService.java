package com.evely.financas.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.dto.InvestmentEntryDTO;
import com.evely.financas.dto.InvestmentSummaryDTO;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.InvestmentEntryType;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.InvestmentEntry;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.InvestmentEntryRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InvestmentService {

    private final InvestmentEntryRepository entryRepository;
    private final AccountRepository accountRepository;

    // =========================================================
    // LANÇAR ENTRADA (aporte, resgate ou rendimento)
    // =========================================================

    @Transactional
    public InvestmentEntry lancarEntrada(InvestmentEntryDTO dto, UUID userId) {
        Account account = accountRepository.findById(dto.accountId())
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));

        // Garante que só contas de investimento aceitam esse fluxo
        if (account.getType() != AccountType.INVESTMENT) {
            throw new RuntimeException(
                "Esta operação só é permitida em contas do tipo INVESTMENT."
            );
        }

        // Garante que o usuário logado é dono da conta
        if (!account.getOwner().getId().equals(userId)) {
            throw new RuntimeException(
                "Você não tem permissão para lançar entradas nesta conta."
            );
        }

        // Valida que não está tentando resgatar mais do que tem
        if (dto.type() == InvestmentEntryType.WITHDRAWAL) {
            BigDecimal saldoAtual = calcularSaldo(account.getId());
            if (dto.amount().compareTo(saldoAtual) > 0) {
                throw new RuntimeException(
                    "Resgate superior ao saldo disponível. Saldo atual: R$" + saldoAtual
                );
            }
        }

        InvestmentEntry entry = new InvestmentEntry();
        entry.setAccount(account);
        entry.setType(dto.type());
        entry.setAmount(dto.amount());
        entry.setEntryDate(dto.entryDate() != null ? dto.entryDate() : LocalDate.now());
        entry.setNotes(dto.notes());

        return entryRepository.save(entry);
    }

    // =========================================================
    // RESUMO DE UMA CONTA DE INVESTIMENTO
    // =========================================================

    public InvestmentSummaryDTO getResumo(UUID accountId, UUID userId) {
        Account account = accountRepository.findById(accountId)
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));

        if (!account.getOwner().getId().equals(userId)) {
            throw new RuntimeException("Acesso negado a esta conta.");
        }

        BigDecimal totalDeposited = entryRepository.sumByAccountAndType(
            accountId, InvestmentEntryType.DEPOSIT
        );
        BigDecimal totalWithdrawn = entryRepository.sumByAccountAndType(
            accountId, InvestmentEntryType.WITHDRAWAL
        );
        BigDecimal totalYield = entryRepository.sumByAccountAndType(
            accountId, InvestmentEntryType.YIELD
        );

        BigDecimal currentBalance = totalDeposited
            .add(totalYield)
            .subtract(totalWithdrawn);

        // Rentabilidade: (rendimento / aporte total) * 100
        // Evita divisão por zero se não houver aportes ainda
        BigDecimal profitability = BigDecimal.ZERO;
        if (totalDeposited.compareTo(BigDecimal.ZERO) > 0) {
            profitability = totalYield
                .divide(totalDeposited, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        }

        return new InvestmentSummaryDTO(
            account.getId(),
            account.getName(),
            totalDeposited,
            totalWithdrawn,
            totalYield,
            currentBalance,
            profitability
        );
    }

    // =========================================================
    // RESUMO DE TODAS AS CONTAS DE INVESTIMENTO DO USUÁRIO
    // =========================================================

    public List<InvestmentSummaryDTO> getResumoGeral(UUID userId) {
        List<Account> contasInvestimento = accountRepository.findByOwnerId(userId)
            .stream()
            .filter(acc -> acc.getType() == AccountType.INVESTMENT)
            .toList();

        return contasInvestimento.stream()
            .map(acc -> getResumo(acc.getId(), userId))
            .toList();
    }

    // =========================================================
    // HISTÓRICO DE LANÇAMENTOS
    // =========================================================

    public List<InvestmentEntry> getHistorico(UUID accountId, UUID userId) {
        Account account = accountRepository.findById(accountId)
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));

        if (!account.getOwner().getId().equals(userId)) {
            throw new RuntimeException("Acesso negado a esta conta.");
        }

        return entryRepository.findByAccountIdOrderByEntryDateDesc(accountId);
    }

    // =========================================================
    // SALDO ATUAL (usado internamente e pelo BalanceService)
    // =========================================================

    public BigDecimal calcularSaldo(UUID accountId) {
        BigDecimal deposited = entryRepository.sumByAccountAndType(
            accountId, InvestmentEntryType.DEPOSIT
        );
        BigDecimal withdrawn = entryRepository.sumByAccountAndType(
            accountId, InvestmentEntryType.WITHDRAWAL
        );
        BigDecimal yield = entryRepository.sumByAccountAndType(
            accountId, InvestmentEntryType.YIELD
        );

        return deposited.add(yield).subtract(withdrawn);
    }
}