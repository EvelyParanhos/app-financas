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
import com.evely.financas.enums.InvoiceStatus;
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
        List<InvoiceSummaryDTO> invoices = buildInvoiceSummaries(userId);
        BigDecimal ccCommitted = calcularFaturasComprometidas(userId, inicio, fim);

        BigDecimal fromInstallments = safe(installmentRepository.somarDividasComFiltro(
            userId, inicio, fim, false));
        BigDecimal virtualExpenses = calcularVirtualRecurrentes(userId, inicio, fim, TransactionType.EXPENSE);
        BigDecimal virtualInvestmentTransfers = calcularVirtualRecurrentes(userId, inicio, fim, TransactionType.TRANSFER);
        BigDecimal committed = fromInstallments.add(virtualExpenses).add(virtualInvestmentTransfers).add(ccCommitted);

        // ── Renda prevista ───────────────────────────────────────────
        BigDecimal incomeInstallments = safe(installmentRepository.somarReceitasPrevistas(userId, inicio, fim));
        BigDecimal virtualIncome = calcularVirtualRecurrentes(userId, inicio, fim, TransactionType.INCOME);
        BigDecimal projectedIncome = incomeInstallments.add(virtualIncome);

        // ── Sobra projetada ──────────────────────────────────────────
        BigDecimal leftover = projectedIncome.subtract(committed);

        // ── Breakdown do comprometido ────────────────────────────────
        BigDecimal fixedExpenses = estimarGastosFixos(userId);

        // ── A receber ────────────────────────────────────────────────
        BigDecimal toReceive = safe(loanRepository.totalAReceber(userId));

        // ── Aportes no mês ───────────────────────────────────────────
        BigDecimal monthlyDeposits = safe(investmentEntryRepository.somarAportesMensais(userId, month, year));

        // ── Checklist ────────────────────────────────────────────────
        List<InstallmentItemDTO> installmentItems = buildRecorrenciasMaterializadas(userId, inicio, fim);
        installmentItems.addAll(buildRecurrentesVirtuais(userId, inicio, fim));
        installmentItems.addAll(buildFaturasChecklist(userId, inicio, fim));
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
        BigDecimal totalCommitted = committedUsuario
            .add(committedParceiro)
            .add(calcularVirtualRecurrentes(userId, inicio, fim, TransactionType.EXPENSE))
            .add(calcularVirtualRecurrentes(userId, inicio, fim, TransactionType.TRANSFER));

        BigDecimal projectedIncome = safe(installmentRepository.somarReceitasPrevistas(userId, inicio, fim));

        BigDecimal fixedExpenses = estimarGastosFixos(userId);
        List<InvoiceSummaryDTO> invoices = buildInvoiceSummaries(userId);
        BigDecimal ccCommitted = calcularFaturasComprometidas(userId, inicio, fim);
        totalCommitted = totalCommitted.add(ccCommitted);
        BigDecimal leftover = projectedIncome.subtract(totalCommitted);

        BigDecimal toReceive = safe(loanRepository.totalAReceber(userId))
            .add(safe(loanRepository.totalAReceber(partnerId)));

        BigDecimal monthlyDeposits = safe(investmentEntryRepository.somarAportesMensais(userId, month, year))
            .add(safe(investmentEntryRepository.somarAportesMensais(partnerId, month, year)));

        List<InstallmentItemDTO> installmentItems = new ArrayList<>();
        installmentItems.addAll(buildRecorrenciasMaterializadas(userId, inicio, fim));
        installmentItems.addAll(buildRecurrentesVirtuais(userId, inicio, fim));
        installmentItems.addAll(buildFaturasChecklist(userId, inicio, fim));
        installmentItems.sort(Comparator.comparing(
            InstallmentItemDTO::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())));

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

    public DashboardDTO getDashboardParceiro(UUID userId, int month, int year) {
        Partnership partnership = partnershipRepository.findByUserId(userId)
            .orElseThrow(() -> new RuntimeException("Nenhuma conexao encontrada."));

        UUID partnerId = partnership.getUserA().getId().equals(userId)
            ? partnership.getUserB().getId()
            : partnership.getUserA().getId();

        return getDashboard(partnerId, month, year);
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
                safe(inv.getTotalAmount()), safe(inv.getPaidAmount()),
                safe(inv.getTotalAmount()).subtract(safe(inv.getPaidAmount())),
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

    private List<InstallmentItemDTO> buildRecorrenciasMaterializadas(UUID userId, LocalDate inicio, LocalDate fim) {
        List<RecurringTransaction> moldes = recurringRepository.findByUserId(userId);
        return transactionRepository.findRecurringMaterializedByUserAndPeriod(userId, inicio, fim)
            .stream()
            .map(t -> {
                InstallmentStatus status = t.getInstallments() != null && !t.getInstallments().isEmpty()
                    ? t.getInstallments().get(0).getStatus()
                    : InstallmentStatus.PAID;
                UUID recurringId = moldes.stream()
                    .filter(rt -> ("[RECORRENTE] " + rt.getDescription()).equals(t.getDescription()))
                    .filter(rt -> rt.getAccount() != null && t.getAccount() != null
                        && rt.getAccount().getId().equals(t.getAccount().getId()))
                    .map(RecurringTransaction::getId)
                    .findFirst()
                    .orElse(null);

                return new InstallmentItemDTO(
                    t.getInstallments() != null && !t.getInstallments().isEmpty()
                        ? t.getInstallments().get(0).getId()
                        : null,
                    t.getDescription().replace("[RECORRENTE] ", ""),
                    t.getCategory() != null ? t.getCategory().getName() : tipoRecorrenteLabel(t),
                    t.getTotalAmount(),
                    t.getPurchaseDate(),
                    status,
                    false,
                    null,
                    recurringId,
                    t.getType() != null ? t.getType().name() : "EXPENSE",
                    "RECURRING",
                    null,
                    nomeContaRecorrente(t)
                );
            })
            .toList();
    }

    private InstallmentItemDTO toInstallmentItem(Installment i) {
        Transaction t = i.getTransaction();
        return new InstallmentItemDTO(
            i.getId(), t.getDescription(),
            t.getCategory() != null ? t.getCategory().getName() : null,
            i.getAmount(), i.getDueDate(), i.getStatus(), t.isSimulation(),
            i.getPayer() != null ? i.getPayer().getName() : null,
            null, t.getType() != null ? t.getType().name() : "EXPENSE",
            "INSTALLMENT", null, t.getAccount() != null ? t.getAccount().getName() : null
        );
    }

    private BigDecimal calcularVirtualRecurrentes(UUID userId, LocalDate inicio, LocalDate fim, TransactionType tipo) {
        return recurringRepository.findByUserId(userId).stream()
            .filter(rt -> rt.getType() == tipo)
            .filter(rt -> tipo != TransactionType.TRANSFER
                || (rt.getDestinationAccount() != null
                    && rt.getDestinationAccount().getType() == AccountType.INVESTMENT))
            .filter(rt -> !transactionRepository.existsByDescriptionAndAccountIdAndPurchaseDateBetween(
                "[RECORRENTE] " + rt.getDescription(), rt.getAccount().getId(), inicio, fim))
            .map(rt -> rt.getEstimatedAmount() != null ? rt.getEstimatedAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal estimarGastosFixos(UUID userId) {
        return recurringRepository.findByUserId(userId).stream()
            .filter(r -> r.getType() == TransactionType.EXPENSE
                || (r.getType() == TransactionType.TRANSFER
                    && r.getDestinationAccount() != null
                    && r.getDestinationAccount().getType() == AccountType.INVESTMENT))
            .map(r -> r.getEstimatedAmount() != null ? r.getEstimatedAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<InstallmentItemDTO> buildRecurrentesVirtuais(UUID userId, LocalDate inicio, LocalDate fim) {
        List<InstallmentItemDTO> virtuais = new ArrayList<>();
        for (RecurringTransaction rt : recurringRepository.findByUserId(userId)) {
            if (rt.getType() != TransactionType.EXPENSE
                    && rt.getType() != TransactionType.INCOME
                    && rt.getType() != TransactionType.TRANSFER) continue;
            if (rt.getType() == TransactionType.TRANSFER
                    && (rt.getDestinationAccount() == null
                        || rt.getDestinationAccount().getType() != AccountType.INVESTMENT)) continue;

            String descMaterializada = "[RECORRENTE] " + rt.getDescription();
            boolean jaMaterializada = transactionRepository.existsByDescriptionAndAccountIdAndPurchaseDateBetween(
                descMaterializada, rt.getAccount().getId(), inicio, fim);

            if (!jaMaterializada) {
                int dia = Math.min(rt.getDayOfMonth(), inicio.lengthOfMonth());
                virtuais.add(new InstallmentItemDTO(
                    null, rt.getDescription(),
                    rt.getCategory() != null ? rt.getCategory().getName() : tipoRecorrenteLabel(rt),
                    rt.getEstimatedAmount() != null ? rt.getEstimatedAmount() : BigDecimal.ZERO,
                    inicio.withDayOfMonth(dia),
                    InstallmentStatus.PENDING, false, null,
                    rt.getId(),
                    rt.getType().name(),
                    "RECURRING", null, nomeContaRecorrente(rt)
                ));
            }
        }
        return virtuais;
    }

    private BigDecimal calcularFaturasComprometidas(UUID userId, LocalDate inicio, LocalDate fim) {
        return invoiceRepository.findChecklistInvoicesByUserIdAndDueDateBetween(userId, inicio, fim)
            .stream()
            .filter(inv -> inv.getStatus() != InvoiceStatus.PAID)
            .map(inv -> safe(inv.getTotalAmount()).subtract(safe(inv.getPaidAmount())))
            .filter(remaining -> remaining.compareTo(BigDecimal.ZERO) > 0)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<InstallmentItemDTO> buildFaturasChecklist(UUID userId, LocalDate inicio, LocalDate fim) {
        return invoiceRepository.findChecklistInvoicesByUserIdAndDueDateBetween(userId, inicio, fim)
            .stream()
            .map(inv -> {
                BigDecimal total = safe(inv.getTotalAmount());
                BigDecimal paid = safe(inv.getPaidAmount());
                BigDecimal remaining = total.subtract(paid);
                InstallmentStatus status = inv.getStatus() == InvoiceStatus.PAID
                    ? InstallmentStatus.PAID
                    : InstallmentStatus.PENDING;
                BigDecimal amount = status == InstallmentStatus.PAID ? total : remaining;

                return new InstallmentItemDTO(
                    null,
                    "Fatura " + inv.getAccount().getName(),
                    "Cartao de credito",
                    amount,
                    inv.getDueDate(),
                    status,
                    false,
                    inv.getAccount().getOwner() != null ? inv.getAccount().getOwner().getName() : null,
                    null,
                    TransactionType.EXPENSE.name(),
                    "INVOICE",
                    inv.getId(),
                    inv.getAccount().getName()
                );
            })
            .toList();
    }

    private String tipoRecorrenteLabel(RecurringTransaction rt) {
        if (rt.getType() == TransactionType.TRANSFER) return "Aporte em investimento";
        if (rt.getType() == TransactionType.INCOME) return "Entrada fixa";
        return "Fixo";
    }

    private String tipoRecorrenteLabel(Transaction t) {
        if (t.getType() == TransactionType.TRANSFER) return "Aporte em investimento";
        if (t.getType() == TransactionType.INCOME) return "Entrada fixa";
        return "Fixo";
    }

    private String nomeContaRecorrente(RecurringTransaction rt) {
        if (rt.getType() == TransactionType.TRANSFER && rt.getDestinationAccount() != null) {
            return rt.getAccount().getName() + " -> " + rt.getDestinationAccount().getName();
        }
        return rt.getAccount() != null ? rt.getAccount().getName() : null;
    }

    private String nomeContaRecorrente(Transaction t) {
        if (t.getType() == TransactionType.TRANSFER && t.getDestinationAccount() != null) {
            return t.getAccount().getName() + " -> " + t.getDestinationAccount().getName();
        }
        return t.getAccount() != null ? t.getAccount().getName() : null;
    }

    /** Evita NullPointerException em somas que podem retornar null do JPQL. */
    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
