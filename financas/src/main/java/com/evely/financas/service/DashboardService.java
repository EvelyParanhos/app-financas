package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
    private final SnapshotRepository snapshotRepository;
    private final CreditCardInvoiceRepository invoiceRepository;
    private final PartnershipRepository partnershipRepository;
    private final RecurringTransactionRepository recurringRepository;
    private final LoanRepository loanRepository;
    private final BudgetService budgetService;
    private final TransactionRepository transactionRepository;
    private final InvestmentService investmentService;
    private final InvestmentEntryRepository investmentEntryRepository;

    // =========================================================
    // DASHBOARD PRINCIPAL
    // =========================================================

    public DashboardDTO getDashboard(UUID userId, int month, int year) {
        LocalDate inicio = LocalDate.of(year, month, 1);
        LocalDate fim = inicio.with(TemporalAdjusters.lastDayOfMonth());

        // ── Saldo por conta (CASH + CHECKING) ──────────────────────
        List<AccountBalanceDTO> accountBreakdown = buildAccountBreakdown(userId);
        BigDecimal currentBalance = accountBreakdown.stream()
            .map(AccountBalanceDTO::getBalance)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ── Comprometido (despesas PENDING do mês) ──────────────────
        // Parcelas materializadas (EXPENSE/LOAN_OUT, excluindo INCOME/TRANSFER)
        BigDecimal fromInstallments = installmentRepository.somarDividasComFiltro(
            userId, inicio, fim, false);
        if (fromInstallments == null) fromInstallments = BigDecimal.ZERO;

        // Gastos fixos virtuais ainda não materializados pelo scheduler
        BigDecimal virtualExpenses = calcularVirtualRecurrentes(userId, inicio, fim, TransactionType.EXPENSE);
        BigDecimal committed = fromInstallments.add(virtualExpenses);

        // ── Renda prevista no mês ────────────────────────────────────
        BigDecimal incomeInstallments = installmentRepository.somarReceitasPrevistas(userId, inicio, fim);
        if (incomeInstallments == null) incomeInstallments = BigDecimal.ZERO;
        BigDecimal virtualIncome = calcularVirtualRecurrentes(userId, inicio, fim, TransactionType.INCOME);
        BigDecimal projectedIncome = incomeInstallments.add(virtualIncome);

        // ── Sobra projetada = renda prevista − comprometido ──────────
        BigDecimal leftover = projectedIncome.subtract(committed);

        // ── Breakdown do comprometido ────────────────────────────────
        // Gastos fixos recorrentes (estimativa mensal)
        BigDecimal fixedExpenses = estimarGastosFixos(userId);
        // Faturas de cartão pendentes
        List<InvoiceSummaryDTO> invoices = buildInvoiceSummaries(userId);
        BigDecimal ccCommitted = invoices.stream()
            .map(InvoiceSummaryDTO::getRemaining)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ── A receber ────────────────────────────────────────────────
        BigDecimal toReceive = loanRepository.totalAReceber(userId);
        if (toReceive == null) toReceive = BigDecimal.ZERO;

        // ── Aportes no mês selecionado ───────────────────────────────
        BigDecimal monthlyDeposits = investmentEntryRepository.somarAportesMensais(userId, month, year);
        if (monthlyDeposits == null) monthlyDeposits = BigDecimal.ZERO;

        // ── Checklist: parcelas PENDING (EXPENSE + INCOME) ──────────
        List<InstallmentItemDTO> installmentItems = installmentRepository
            .findPendingWithDetailsByUserAndPeriod(userId, inicio, fim)
            .stream().map(this::toInstallmentItem).collect(Collectors.toList());

        // Adiciona recorrentes virtuais (não materializados ainda)
        installmentItems.addAll(buildRecurrentesVirtuais(userId, inicio, fim));
        installmentItems.sort(Comparator.comparing(
            InstallmentItemDTO::getDueDate,
            Comparator.nullsLast(Comparator.naturalOrder())
        ));

        // ── Últimas transações reais ─────────────────────────────────
        List<TransactionItemDTO> recentTransactions = transactionRepository
            .findTop5ByAccountOwnerIdAndIsSimulationFalseOrderByPurchaseDateDesc(userId)
            .stream()
            .map(t -> new TransactionItemDTO(
                t.getId(),
                t.getDescription(),
                t.getCategory() != null ? t.getCategory().getName() : "Sem Categoria",
                t.getTotalAmount(),
                t.getPurchaseDate(),
                t.getType().name()
            )).toList();

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

        // Saldo compartilhado (contas com shared=true de ambos)
        BigDecimal saldoCompartilhado = calcularSaldoCompartilhado(userId, partnerId);
        List<AccountBalanceDTO> breakdown = buildAccountBreakdown(userId); // simplificado para o próprio

        BigDecimal committedUsuario = installmentRepository.somarDividasComFiltro(userId, inicio, fim, false);
        if (committedUsuario == null) committedUsuario = BigDecimal.ZERO;

        BigDecimal committedParceiro = installmentRepository.somarDividasComFiltroEContaShared(partnerId, inicio, fim);
        if (committedParceiro == null) committedParceiro = BigDecimal.ZERO;

        BigDecimal totalCommitted = committedUsuario.add(committedParceiro);

        BigDecimal projectedIncome = installmentRepository.somarReceitasPrevistas(userId, inicio, fim);
        if (projectedIncome == null) projectedIncome = BigDecimal.ZERO;

        BigDecimal leftover = projectedIncome.subtract(totalCommitted);

        BigDecimal fixedExpenses = estimarGastosFixos(userId);
        List<InvoiceSummaryDTO> invoices = buildInvoiceSummaries(userId);
        BigDecimal ccCommitted = invoices.stream()
            .map(InvoiceSummaryDTO::getRemaining)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal toReceive = loanRepository.totalAReceber(userId);
        if (toReceive == null) toReceive = BigDecimal.ZERO;
        BigDecimal toReceiveParceiro = loanRepository.totalAReceber(partnerId);
        if (toReceiveParceiro == null) toReceiveParceiro = BigDecimal.ZERO;

        BigDecimal monthlyDepositsUsuario = investmentEntryRepository.somarAportesMensais(userId, month, year);
        BigDecimal monthlyDepositsParceiro = investmentEntryRepository.somarAportesMensais(partnerId, month, year);
        if (monthlyDepositsUsuario == null) monthlyDepositsUsuario = BigDecimal.ZERO;
        if (monthlyDepositsParceiro == null) monthlyDepositsParceiro = BigDecimal.ZERO;

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

        List<TransactionItemDTO> recentTransactions = transactionRepository
            .findTop5ByAccountOwnerIdAndIsSimulationFalseOrderByPurchaseDateDesc(userId)
            .stream()
            .map(t -> new TransactionItemDTO(
                t.getId(), t.getDescription(),
                t.getCategory() != null ? t.getCategory().getName() : "Sem Categoria",
                t.getTotalAmount(), t.getPurchaseDate(), t.getType().name()))
            .toList();

        List<BudgetStatusDTO> budgets = budgetService.getStatusDoMes(userId, month, year);
        List<MonthProjectionDTO> projection = buildProjection(userId, month, year);

        return new DashboardDTO(
            saldoCompartilhado, breakdown,
            totalCommitted, fixedExpenses, ccCommitted,
            leftover, projectedIncome,
            toReceive.add(toReceiveParceiro),
            monthlyDepositsUsuario.add(monthlyDepositsParceiro),
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
            .collect(Collectors.toMap(
                r -> r[0] + "-" + r[1],
                r -> r
            ));

        BigDecimal recorrentes = estimarGastosFixos(userId);

        List<MonthProjectionDTO> result = new ArrayList<>();

        for (int i = 0; i < 12; i++) {
            LocalDate mes = inicio.plusMonths(i);
            String key = mes.getMonthValue() + "-" + mes.getYear();

            Object[] row = dataMap.get(key);

            BigDecimal real = BigDecimal.ZERO;
            BigDecimal simulado = BigDecimal.ZERO;

            if (row != null) {
                real = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
                simulado = row[3] != null ? (BigDecimal) row[3] : BigDecimal.ZERO;
            }

            result.add(new MonthProjectionDTO(
                mes.getMonthValue(),
                mes.getYear(),
                real.add(simulado).add(recorrentes),
                real,
                simulado,
                recorrentes
            ));
        }

        return result;
    }

    // =========================================================
    // HELPERS PRIVADOS
    // =========================================================

    private List<AccountBalanceDTO> buildAccountBreakdown(UUID userId) {
        return accountRepository.findByOwnerId(userId).stream()
            .filter(acc -> acc.getType() == AccountType.CHECKING || acc.getType() == AccountType.CASH)
            .map(acc -> new AccountBalanceDTO(
                acc.getName(),
                acc.getType().name(),
                snapshotRepository.findFirstByAccountOrderBySnapshotDateDesc(acc)
                    .map(Snapshot::getAmount).orElse(BigDecimal.ZERO)
            ))
            .collect(Collectors.toList());
    }

    private BigDecimal calcularSaldoCompartilhado(UUID userId, UUID partnerId) {
        List<Account> contasUsuario = accountRepository.findByOwnerIdAndSharedTrue(userId);
        List<Account> contasParceiro = accountRepository.findByOwnerIdAndSharedTrue(partnerId);

        BigDecimal total = BigDecimal.ZERO;
        for (Account acc : contasUsuario) {
            total = total.add(snapshotRepository
                .findFirstByAccountOrderBySnapshotDateDesc(acc)
                .map(Snapshot::getAmount).orElse(BigDecimal.ZERO));
        }
        for (Account acc : contasParceiro) {
            total = total.add(snapshotRepository
                .findFirstByAccountOrderBySnapshotDateDesc(acc)
                .map(Snapshot::getAmount).orElse(BigDecimal.ZERO));
        }
        return total;
    }

    private List<InvoiceSummaryDTO> buildInvoiceSummaries(UUID userId) {
        return invoiceRepository.findPendingInvoicesByUserId(userId).stream()
            .map(inv -> new InvoiceSummaryDTO(
                inv.getId(),
                inv.getAccount().getName(),
                inv.getReferenceMonth(),
                inv.getReferenceYear(),
                inv.getTotalAmount(),
                inv.getPaidAmount(),
                inv.getTotalAmount().subtract(inv.getPaidAmount()),
                inv.getStatus()
            ))
            .toList();
    }

    private InstallmentItemDTO toInstallmentItem(Installment i) {
        Transaction t = i.getTransaction();
        return new InstallmentItemDTO(
            i.getId(),
            t.getDescription(),
            t.getCategory() != null ? t.getCategory().getName() : null,
            i.getAmount(),
            i.getDueDate(),
            i.getStatus(),
            t.isSimulation(),
            i.getPayer() != null ? i.getPayer().getName() : null,
            null,
            t.getType() != null ? t.getType().name() : "EXPENSE"
        );
    }

    /**
     * Soma os valores estimados de transações recorrentes do tipo especificado
     * que ainda NÃO foram materializadas pelo scheduler no período informado.
     */
    private BigDecimal calcularVirtualRecurrentes(
            UUID userId, LocalDate inicio, LocalDate fim, TransactionType tipo) {
        return recurringRepository.findByAccountOwnerId(userId).stream()
            .filter(rt -> rt.getType() == tipo)
            .filter(rt -> {
                String desc = "[RECORRENTE] " + rt.getDescription();
                return !transactionRepository.existsByDescriptionAndAccountIdAndPurchaseDateBetween(
                    desc, rt.getAccount().getId(), inicio, fim);
            })
            .map(rt -> rt.getEstimatedAmount() != null ? rt.getEstimatedAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Estimativa mensal dos gastos fixos recorrentes (para o breakdown do card).
     */
    private BigDecimal estimarGastosFixos(UUID userId) {
        return recurringRepository.findByAccountOwnerId(userId).stream()
            .filter(r -> r.getType() == TransactionType.EXPENSE)
            .map(r -> r.getEstimatedAmount() != null ? r.getEstimatedAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Constrói a lista de itens virtuais do checklist para transações recorrentes
     * que ainda não foram materializadas no mês selecionado.
     */
    private List<InstallmentItemDTO> buildRecurrentesVirtuais(
            UUID userId, LocalDate inicio, LocalDate fim) {

        List<InstallmentItemDTO> virtuais = new ArrayList<>();

        for (RecurringTransaction rt : recurringRepository.findByAccountOwnerId(userId)) {
            if (rt.getType() != TransactionType.EXPENSE && rt.getType() != TransactionType.INCOME) {
                continue;
            }

            String descMaterializada = "[RECORRENTE] " + rt.getDescription();
            boolean jaMaterializada = transactionRepository
                .existsByDescriptionAndAccountIdAndPurchaseDateBetween(
                    descMaterializada, rt.getAccount().getId(), inicio, fim);

            if (!jaMaterializada) {
                int dia = Math.min(rt.getDayOfMonth(), inicio.lengthOfMonth());
                LocalDate vencimento = inicio.withDayOfMonth(dia);

                virtuais.add(new InstallmentItemDTO(
                    null,
                    rt.getDescription(),
                    rt.getCategory() != null ? rt.getCategory().getName() : "Fixo",
                    rt.getEstimatedAmount() != null ? rt.getEstimatedAmount() : BigDecimal.ZERO,
                    vencimento,
                    InstallmentStatus.PENDING,
                    false,
                    null,
                    rt.getId(),
                    rt.getType().name()   // EXPENSE ou INCOME — frontend usa para ícone/cor
                ));
            }
        }

        return virtuais;
    }
}