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
import com.evely.financas.repository.PartnershipRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InvestmentService {

    private final InvestmentEntryRepository entryRepository;
    private final AccountRepository accountRepository;
    private final PartnershipRepository partnershipRepository;

    // =========================================================
    // LANÇAR ENTRADA (aporte, resgate ou rendimento)
    // =========================================================

    /**
     * Lança um movimento em uma conta de investimento.
     *
     * ✅ Regra de acesso:
     *   - Dono da conta: sempre pode operar.
     *   - Parceiro do dono: pode operar se a conta tiver is_shared = true.
     *     Isso cobre o cenário "eu e meu marido depositamos na mesma reserva".
     */
    @Transactional
    public InvestmentEntry lancarEntrada(InvestmentEntryDTO dto, UUID userId) {
        Account account = accountRepository.findByIdAndActiveTrue(dto.accountId())
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));

        if (account.getType() != AccountType.INVESTMENT) {
            throw new RuntimeException(
                "Esta operação só é permitida em contas do tipo INVESTMENT.");
        }

        validarAcessoInvestimento(account, userId);

        if (dto.type() == InvestmentEntryType.WITHDRAWAL) {
            BigDecimal saldoAtual = calcularSaldo(account.getId());
            if (dto.amount().compareTo(saldoAtual) > 0) {
                throw new RuntimeException(
                    "Resgate superior ao saldo disponível. Saldo atual: R$" + saldoAtual);
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
    // RESUMO DE UMA CONTA
    // =========================================================

    public InvestmentSummaryDTO getResumo(UUID accountId, UUID userId) {
        Account account = accountRepository.findByIdAndActiveTrue(accountId)
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));

        validarAcessoInvestimento(account, userId);
        return calcularResumo(account);
    }

    // =========================================================
    // RESUMO GERAL DO USUÁRIO (contas próprias + compartilhadas)
    // =========================================================

    public List<InvestmentSummaryDTO> getResumoGeral(UUID userId) {
        // Contas próprias
        List<Account> proprias = accountRepository.findByOwnerId(userId)
            .stream()
            .filter(acc -> acc.getType() == AccountType.INVESTMENT)
            .toList();

        // Contas compartilhadas do parceiro (is_shared = true, dono = parceiro)
        List<Account> compartilhadas = partnershipRepository.findByUserId(userId)
            .map(p -> {
                UUID partnerId = p.getUserA().getId().equals(userId)
                    ? p.getUserB().getId()
                    : p.getUserA().getId();
                return accountRepository.findByOwnerIdAndSharedTrue(partnerId)
                    .stream()
                    .filter(acc -> acc.getType() == AccountType.INVESTMENT)
                    .toList();
            })
            .orElse(List.of());

        return java.util.stream.Stream.concat(proprias.stream(), compartilhadas.stream())
            .distinct()
            .map(this::calcularResumo)
            .toList();
    }

    // =========================================================
    // HISTÓRICO
    // =========================================================

    public List<InvestmentEntry> getHistorico(UUID accountId, UUID userId) {
        Account account = accountRepository.findByIdAndActiveTrue(accountId)
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));
        validarAcessoInvestimento(account, userId);
        return entryRepository.findByAccountIdOrderByEntryDateDesc(accountId);
    }

    // =========================================================
    // SALDO ATUAL (usado internamente e pelo BalanceService)
    // =========================================================

    public BigDecimal calcularSaldo(UUID accountId) {
        BigDecimal deposited = entryRepository.sumByAccountAndType(accountId, InvestmentEntryType.DEPOSIT);
        BigDecimal withdrawn = entryRepository.sumByAccountAndType(accountId, InvestmentEntryType.WITHDRAWAL);
        BigDecimal yield    = entryRepository.sumByAccountAndType(accountId, InvestmentEntryType.YIELD);
        return deposited.add(yield).subtract(withdrawn);
    }

    // =========================================================
    // PRIVADO
    // =========================================================

    private InvestmentSummaryDTO calcularResumo(Account account) {
        BigDecimal totalDeposited = entryRepository.sumByAccountAndType(account.getId(), InvestmentEntryType.DEPOSIT);
        BigDecimal totalWithdrawn = entryRepository.sumByAccountAndType(account.getId(), InvestmentEntryType.WITHDRAWAL);
        BigDecimal totalYield     = entryRepository.sumByAccountAndType(account.getId(), InvestmentEntryType.YIELD);
        BigDecimal currentBalance = totalDeposited.add(totalYield).subtract(totalWithdrawn);

        BigDecimal profitability = BigDecimal.ZERO;
        if (totalDeposited.compareTo(BigDecimal.ZERO) > 0) {
            profitability = totalYield
                .divide(totalDeposited, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        }

        return new InvestmentSummaryDTO(
            account.getId(), account.getName(),
            totalDeposited, totalWithdrawn, totalYield,
            currentBalance, profitability
        );
    }

    /**
     * Valida se o usuário pode operar na conta de investimento:
     * - É o dono, OU
     * - É parceiro do dono E a conta é compartilhada (is_shared = true).
     */
    private void validarAcessoInvestimento(Account account, UUID userId) {
        boolean isDono = account.getOwner().getId().equals(userId);
        if (isDono) return;

        // Verifica se é parceiro e a conta é compartilhada
        boolean eParceiroDaConta = account.isShared()
            && partnershipRepository.findByUserId(account.getOwner().getId())
                .map(p -> p.getUserA().getId().equals(userId)
                       || p.getUserB().getId().equals(userId))
                .orElse(false);

        if (!eParceiroDaConta) {
            throw new RuntimeException(
                "Você não tem permissão para operar nesta conta de investimento.");
        }
    }
}
