package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.*;

import org.springframework.stereotype.Service;
import com.evely.financas.dto.*;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.enums.TransactionType;
import com.evely.financas.model.*;
import com.evely.financas.repository.*;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final InstallmentRepository installmentRepository;
    private final AccountRepository accountRepository;
    private final CreditCardInvoiceRepository invoiceRepository;
    private final PartnershipRepository partnershipRepository;
    private final RecurringTransactionRepository recurringRepository;
    private final LoanRepository loanRepository;
    private final BudgetService budgetService;
    private final TransactionRepository transactionRepository;
    private final InvestmentService investmentService;
    private final InvestmentEntryRepository investmentEntryRepository;
    // ✅ SnapshotRepository REMOVIDO — saldo agora vem de account.balance

    // =========================================================
    // DASHBOARD PRINCIPAL
    // =========================================================

    public DashboardDTO getDashboard(UUID userId, int month, int year) {
        LocalDate inicio = LocalDate.of(year, month, 1);
        LocalDate fim = inicio.with(TemporalAdjusters.lastDayOfMonth());

        // ── Saldo por conta (CASH + CHECKING) ──────────────────────
        // ✅ Lê account.balance direto — sem snapshot
        List<AccountBalanceDTO> accountBreakdown = buildAccountBreakdown(userId);
        BigDecimal currentBalance = accountBreakdown.stream()
            .map(AccountBalanceDTO::getBalance)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ── Comprometido (despesas PENDING do mês) ──────────────────
        BigDecimal fromInstallments = safe(installmentRepository.somarDividasComFiltro(
            userId, inicio, fim, false));
        BigDecimal virtualExpenses = calcularVirtualRecurrentes(userId, inicio, fim, TransactionType.EXPENSE);
        BigDecimal committed = fromInstallments.add(virtualExpenses);

        // ── Renda prevista ───────────────────────────────────────────
        BigDecimal incomeInstallments = safe(installmentRepository.somarReceitasPrevistas(userId, inicio, fim));
        BigDecimal virtualIncome = calcularVirtualRecurrentes(userId, inicio, fim, TransactionType.INCOME);
        BigDecimal projectedIncome = incomeInstallments.add(virtualIncome);

        // ── Sobra projetada ──────────────────────────────────────────
        BigDecimal leftover = projectedIncome.subtract(committed);

        // ── Breakdown do comprometido ────────────────────────────────
        BigDecimal fixedExpenses = estimarGastosFixos(userId);
        List<InvoiceSummaryDTO> invoices = buildInvoiceSummaries(userId);
        BigDecimal ccCommitted = invoices.stream()
            .map(InvoiceSummaryDTO::getRemaining)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ── A receber ────────────────────────────────────────────────
        BigDecimal toReceive = safe(loanRepository.totalAReceber(userId));

        // ── Aportes no mês ───────────────────────────────────────────
        BigDecimal monthlyDeposits = safe(investmentEntryRepository.somarAportesMensais(userId, month, year));

        // ── Checklist ────────────────────────────────────────────────
        List<InstallmentItemDTO> installmentItems = installmentRepository
            .findPendingWithDetailsByUserAndPeriod(userId, inicio, fim)
            .stream().map(this::toInstallmentItem).collect(Collectors.toList());

        installmentItems.addAll(buildRecurrentesVirtuais(userId, inicio, fim));
        installmentItems.sort(Comparator.comparing(
            InstallmentItemDTO::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())));

        // ── Últimas transações ────────────────────────────────────────
        List<TransactionItemDTO> recentTransactions = buildRecentTransactions(userId);

        List<BudgetStatusDTO> budgets = budgetService.getStatusDoMes(userId, month, year);
        List<MonthProjectionDTO> projection = buildProjection(userId, month, year);
        boolean hasPartner = partnershipRepository.findByUserId(userId).isPresent();

        return new DashboardDTO(
            currentBalance, accountBreakdown,
            committed, fixedExpenses, ccCommitted,
            leftover, projectedIncome,
            toReceive, monthlyDeposits,
            invoices, installmentItems, recentTransactions,
            budgets, projection, hasPartner
        );
    }

    // =========================================================
    // DASHBOARD DO CASAL
    // =========================================================

    public DashboardDTO getDashboardCasal(UUID userId, int month, int year) {
        Partnership partnership = partnershipRepository.findByUserId(userId)
            .orElseThrow(() -> new RuntimeException("Nenhuma conexão encontrada."));

        UUID partnerId = partnership.getUserA().getId().equals(userId)
            ? partnership.getUserB().getId()
            : partnership.getUserA().getId();

        LocalDate inicio = LocalDate.of(year, month, 1);
        LocalDate fim = inicio.with(TemporalAdjusters.lastDayOfMonth());

        // ✅ Saldo compartilhado usando account.balance direto
        BigDecimal saldoCompartilhado = calcularSaldoCompartilhado(userId, partnerId);
        List<AccountBalanceDTO> breakdown = buildAccountBreakdown(userId);

        BigDecimal committedUsuario = safe(installmentRepository.somarDividasComFiltro(userId, inicio, fim, false));
        BigDecimal committedParceiro = safe(installmentRepository.somarDividasComFiltroEContaShared(partnerId, inicio, fim));
        BigDecimal totalCommitted = committedUsuario.add(committedParceiro);

        BigDecimal projectedIncome = safe(installmentRepository.somarReceitasPrevistas(userId, inicio, fim));
        BigDecimal leftover = projectedIncome.subtract(totalCommitted);

        BigDecimal fixedExpenses = estimarGastosFixos(userId);
        List<InvoiceSummaryDTO> invoices = buildInvoiceSummaries(userId);
        BigDecimal ccCommitted = invoices.stream()
            .map(InvoiceSummaryDTO::getRemaining).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal toReceive = safe(loanRepository.totalAReceber(userId))
            .add(safe(loanRepository.totalAReceber(partnerId)));

        BigDecimal monthlyDeposits = safe(investmentEntryRepository.somarAportesMensais(userId, month, year))
            .add(safe(investmentEntryRepository.somarAportesMensais(partnerId, month, year)));

        List<Installment> parcelasUsuario = installmentRepository
            .findPendingWithDetailsByUserAndPeriod(userId, inicio, fim);
        List<Installment> parcelasParceiro = installmentRepository
            .findPendingSharedByPartnerAndPeriod(partnerId, inicio, fim);

        List<InstallmentItemDTO> installmentItems = Stream
            .concat(parcelasUsuario.stream(), parcelasParceiro.stream())
            .map(this::toInstallmentItem)
            .sorted(Comparator.comparing(InstallmentItemDTO::getDueDate,
                Comparator.nullsLast(Comparator.naturalOrder())))
            .collect(Collectors.toList());

        List<TransactionItemDTO> recentTransactions = buildRecentTransactions(userId);
        List<BudgetStatusDTO> budgets = budgetService.getStatusDoMes(userId, month, year);
        List<MonthProjectionDTO> projection = buildProjection(userId, month, year);

        return new DashboardDTO(
            saldoCompartilhado, breakdown,
            totalCommitted, fixedExpenses, ccCommitted,
            leftover, projectedIncome,
            toReceive, monthlyDeposits,
            invoices, installmentItems, recentTransactions,
            budgets, projection, true
        );
    }

    // =========================================================
    // PROJEÇÃO DE 12 MESES
    // =========================================================

    private List<MonthProjectionDTO> buildProjection(UUID userId, int startMonth, int startYear) {
        LocalDate inicio = LocalDate.of(startYear, startMonth, 1);
        LocalDate fim = inicio.plusMonths(12).with(TemporalAdjusters.lastDayOfMonth());

        List<Object[]> rows = installmentRepository.projecaoPorMes(userId, inicio, fim);
        Map<String, Object[]> dataMap = rows.stream()
            .collect(Collectors.toMap(r -> r[0] + "-" + r[1], r -> r));

        BigDecimal recorrentes = estimarGastosFixos(userId);
        List<MonthProjectionDTO> result = new ArrayList<>();

        for (int i = 0; i < 12; i++) {
            LocalDate mes = inicio.plusMonths(i);
            String key = mes.getMonthValue() + "-" + mes.getYear();
            Object[] row = dataMap.get(key);

            BigDecimal real = row != null && row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            BigDecimal simulado = row != null && row[3] != null ? (BigDecimal) row[3] : BigDecimal.ZERO;

            result.add(new MonthProjectionDTO(
                mes.getMonthValue(), mes.getYear(),
                real.add(simulado).add(recorrentes), real, simulado, recorrentes
            ));
        }
        return result;
    }

    // =========================================================
    // HELPERS PRIVADOS
    // =========================================================

    /**
     * ✅ Usa account.balance diretamente — sem query de snapshot.
     */
    private List<AccountBalanceDTO> buildAccountBreakdown(UUID userId) {
        return accountRepository.findByOwnerId(userId).stream()
            .filter(acc -> acc.getType() == AccountType.CHECKING || acc.getType() == AccountType.CASH)
            .map(acc -> new AccountBalanceDTO(acc.getName(), acc.getType().name(), acc.getBalance()))
            .collect(Collectors.toList());
    }

    /**
     * ✅ Soma saldo das contas compartilhadas via account.balance.
     */
    private BigDecimal calcularSaldoCompartilhado(UUID userId, UUID partnerId) {
        BigDecimal total = BigDecimal.ZERO;
        for (Account acc : accountRepository.findByOwnerIdAndSharedTrue(userId)) {
            total = total.add(acc.getBalance());
        }
        for (Account acc : accountRepository.findByOwnerIdAndSharedTrue(partnerId)) {
            total = total.add(acc.getBalance());
        }
        return total;
    }

    private List<InvoiceSummaryDTO> buildInvoiceSummaries(UUID userId) {
        return invoiceRepository.findPendingInvoicesByUserId(userId).stream()
            .map(inv -> new InvoiceSummaryDTO(
                inv.getId(), inv.getAccount().getName(),
                inv.getReferenceMonth(), inv.getReferenceYear(),
                inv.getTotalAmount(), inv.getPaidAmount(),
                inv.getTotalAmount().subtract(inv.getPaidAmount()),
                inv.getStatus()))
            .toList();
    }

    private List<TransactionItemDTO> buildRecentTransactions(UUID userId) {
        return transactionRepository
            .findTop5ByAccountOwnerIdAndIsSimulationFalseOrderByPurchaseDateDesc(userId)
            .stream()
            .map(t -> new TransactionItemDTO(
                t.getId(), t.getDescription(),
                t.getCategory() != null ? t.getCategory().getName() : "Sem Categoria",
                t.getTotalAmount(), t.getPurchaseDate(), t.getType().name()))
            .toList();
    }

    private InstallmentItemDTO toInstallmentItem(Installment i) {
        Transaction t = i.getTransaction();
        return new InstallmentItemDTO(
            i.getId(), t.getDescription(),
            t.getCategory() != null ? t.getCategory().getName() : null,
            i.getAmount(), i.getDueDate(), i.getStatus(), t.isSimulation(),
            i.getPayer() != null ? i.getPayer().getName() : null,
            null, t.getType() != null ? t.getType().name() : "EXPENSE"
        );
    }

    private BigDecimal calcularVirtualRecurrentes(UUID userId, LocalDate inicio, LocalDate fim, TransactionType tipo) {
        return recurringRepository.findByAccountOwnerId(userId).stream()
            .filter(rt -> rt.getType() == tipo)
            .filter(rt -> !transactionRepository.existsByDescriptionAndAccountIdAndPurchaseDateBetween(
                "[RECORRENTE] " + rt.getDescription(), rt.getAccount().getId(), inicio, fim))
            .map(rt -> rt.getEstimatedAmount() != null ? rt.getEstimatedAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal estimarGastosFixos(UUID userId) {
        return recurringRepository.findByAccountOwnerId(userId).stream()
            .filter(r -> r.getType() == TransactionType.EXPENSE)
            .map(r -> r.getEstimatedAmount() != null ? r.getEstimatedAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<InstallmentItemDTO> buildRecurrentesVirtuais(UUID userId, LocalDate inicio, LocalDate fim) {
        List<InstallmentItemDTO> virtuais = new ArrayList<>();
        for (RecurringTransaction rt : recurringRepository.findByAccountOwnerId(userId)) {
            if (rt.getType() != TransactionType.EXPENSE && rt.getType() != TransactionType.INCOME) continue;

            String descMaterializada = "[RECORRENTE] " + rt.getDescription();
            boolean jaMaterializada = transactionRepository.existsByDescriptionAndAccountIdAndPurchaseDateBetween(
                descMaterializada, rt.getAccount().getId(), inicio, fim);

            if (!jaMaterializada) {
                int dia = Math.min(rt.getDayOfMonth(), inicio.lengthOfMonth());
                virtuais.add(new InstallmentItemDTO(
                    null, rt.getDescription(),
                    rt.getCategory() != null ? rt.getCategory().getName() : "Fixo",
                    rt.getEstimatedAmount() != null ? rt.getEstimatedAmount() : BigDecimal.ZERO,
                    inicio.withDayOfMonth(dia),
                    InstallmentStatus.PENDING, false, null,
                    rt.getId(),
                    rt.getType().name()
                ));
            }
        }
        return virtuais;
    }

    /** Evita NullPointerException em somas que podem retornar null do JPQL. */
    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}