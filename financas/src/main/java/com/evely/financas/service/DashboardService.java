package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
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

    // =========================================================
    // DASHBOARD PRINCIPAL
    // =========================================================

    public DashboardDTO getDashboard(UUID userId, int month, int year) {
        LocalDate inicio = LocalDate.of(year, month, 1);
        LocalDate fim = inicio.with(TemporalAdjusters.lastDayOfMonth());

        BigDecimal currentBalance = calcularSaldoReal(userId);
        BigDecimal committed = installmentRepository.somarDividasComFiltro(
            userId, inicio, fim, false);
        if (committed == null) committed = BigDecimal.ZERO;

        BigDecimal leftover = currentBalance.subtract(committed);

        BigDecimal toReceive = loanRepository.totalAReceber(userId);
        if (toReceive == null) toReceive = BigDecimal.ZERO;

        BigDecimal investedBalance = calcularSaldoInvestido(userId);

        List<InvoiceSummaryDTO> invoices = buildInvoiceSummaries(userId);

        List<InstallmentItemDTO> installmentItems = installmentRepository
            .findPendingWithDetailsByUserAndPeriod(userId, inicio, fim)
            .stream().map(this::toInstallmentItem).collect(java.util.stream.Collectors.toList());

        // Adiciona os recorrentes que ainda não foram materializados neste mês
        installmentItems.addAll(buildRecurrentesVirtuais(userId, inicio, fim));
        installmentItems.sort(java.util.Comparator.comparing(
            InstallmentItemDTO::getDueDate,
            java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())
        ));

        // RN14 — Simulações são invisíveis no histórico real
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
            currentBalance, committed, leftover, toReceive, investedBalance,
            invoices, installmentItems, recentTransactions, budgets, projection, hasPartner
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

        BigDecimal recorrentes = calcularTotalRecorrentes(userId);

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

        BigDecimal saldoCompartilhado = calcularSaldoCompartilhado(userId, partnerId);

        BigDecimal committedUsuario = installmentRepository.somarDividasComFiltro(
            userId, inicio, fim, false);
        if (committedUsuario == null) committedUsuario = BigDecimal.ZERO;

        BigDecimal committedParceiro = installmentRepository
            .somarDividasComFiltroEContaShared(partnerId, inicio, fim);
        if (committedParceiro == null) committedParceiro = BigDecimal.ZERO;

        BigDecimal totalCommitted = committedUsuario.add(committedParceiro);
        BigDecimal leftover = saldoCompartilhado.subtract(totalCommitted);

        BigDecimal toReceive = loanRepository.totalAReceber(userId);
        if (toReceive == null) toReceive = BigDecimal.ZERO;
        BigDecimal toReceiveParceiro = loanRepository.totalAReceber(partnerId);
        if (toReceiveParceiro == null) toReceiveParceiro = BigDecimal.ZERO;

        List<InvoiceSummaryDTO> invoices = buildInvoiceSummaries(userId);

        List<Installment> parcelasUsuario = installmentRepository
            .findPendingWithDetailsByUserAndPeriod(userId, inicio, fim);

        List<Installment> parcelasParceiro = installmentRepository
            .findPendingSharedByPartnerAndPeriod(partnerId, inicio, fim);

        List<InstallmentItemDTO> installmentItems = Stream
            .concat(parcelasUsuario.stream(), parcelasParceiro.stream())
            .map(this::toInstallmentItem)
            .toList();

        List<BudgetStatusDTO> budgets = budgetService.getStatusDoMes(userId, month, year);
        List<MonthProjectionDTO> projection = buildProjection(userId, month, year);

        BigDecimal investedUsuario = calcularSaldoInvestido(userId);
        BigDecimal investedParceiro = calcularSaldoInvestido(partnerId);
        BigDecimal totalInvested = investedUsuario.add(investedParceiro);

        // RN14 — Simulações excluídas do histórico
        List<TransactionItemDTO> recentTransactions = transactionRepository
            .findTop5ByAccountOwnerIdAndIsSimulationFalseOrderByPurchaseDateDesc(userId)
            .stream()
            .map(t -> new TransactionItemDTO(
                t.getId(), t.getDescription(),
                t.getCategory() != null ? t.getCategory().getName() : "Sem Categoria",
                t.getTotalAmount(), t.getPurchaseDate(), t.getType().name()))
            .toList();

        return new DashboardDTO(
            saldoCompartilhado, totalCommitted, leftover,
            toReceive.add(toReceiveParceiro), totalInvested,
            invoices, installmentItems, recentTransactions, budgets, projection, true
        );
    }

    // =========================================================
    // HELPERS PRIVADOS
    // =========================================================

    private BigDecimal calcularSaldoReal(UUID userId) {
        return accountRepository.findByOwnerId(userId).stream()
            .filter(acc ->
                acc.getType() == AccountType.CHECKING ||
                acc.getType() == AccountType.CASH
            )
            .map(acc -> snapshotRepository
                .findFirstByAccountOrderBySnapshotDateDesc(acc)
                .map(Snapshot::getAmount)
                .orElse(BigDecimal.ZERO)
            )
            .reduce(BigDecimal.ZERO, BigDecimal::add);
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
        i.getPayer().getName(),
        null  // recurringTransactionId = null para parcelas reais
    );
}

    private BigDecimal calcularTotalRecorrentes(UUID userId) {
        return recurringRepository.findByAccountOwnerId(userId).stream()
            .filter(r -> r.getType() == TransactionType.EXPENSE)
            .map(r -> r.getEstimatedAmount() != null
                ? r.getEstimatedAmount()
                : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calcularSaldoInvestido(UUID userId) {
    BigDecimal total = BigDecimal.ZERO;
    for (Account acc : accountRepository.findByOwnerId(userId)) {
        if (acc.getType() == AccountType.INVESTMENT) {
            total = total.add(investmentService.calcularSaldo(acc.getId()));
        }
    }
    return total;
    }

    private List<InstallmentItemDTO> buildRecurrentesVirtuais(UUID userId, LocalDate inicio, LocalDate fim) {
    List<InstallmentItemDTO> virtuais = new ArrayList<>();

    for (RecurringTransaction rt : recurringRepository.findByAccountOwnerId(userId)) {
        if (rt.getType() != TransactionType.EXPENSE && rt.getType() != TransactionType.INCOME) {
            continue;
        }

        // Evita duplicata: verifica se o scheduler já materializou este mês
        String descMaterializada = "[RECORRENTE] " + rt.getDescription();
        boolean jaMaterializada = transactionRepository
            .existsByDescriptionAndAccountIdAndPurchaseDateBetween(
                descMaterializada,
                rt.getAccount().getId(),
                inicio,
                fim
            );

        if (!jaMaterializada) {
            int dia = Math.min(rt.getDayOfMonth(), inicio.lengthOfMonth());
            LocalDate vencimento = inicio.withDayOfMonth(dia);

            virtuais.add(new InstallmentItemDTO(
                null,                     // installmentId = null (item virtual)
                rt.getDescription(),
                rt.getCategory() != null ? rt.getCategory().getName() : "Fixo",
                rt.getEstimatedAmount() != null ? rt.getEstimatedAmount() : BigDecimal.ZERO,
                vencimento,
                InstallmentStatus.PENDING,
                false,
                null,                     // payerName
                rt.getId()                // recurringTransactionId — identifica no frontend
            ));
        }
    }

    return virtuais;
}
}