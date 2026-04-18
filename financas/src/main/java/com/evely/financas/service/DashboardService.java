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

    // =========================================================
    // DASHBOARD PRINCIPAL
    // =========================================================

    public DashboardDTO getDashboard(UUID userId, int month, int year) {
        LocalDate inicio = LocalDate.of(year, month, 1);
        LocalDate fim = inicio.with(TemporalAdjusters.lastDayOfMonth());

        // 1. Saldo real — soma dos snapshots mais recentes das contas não-investimento
        BigDecimal currentBalance = calcularSaldoReal(userId);

        // 2. Total comprometido no mês (parcelas PENDING, excluindo simulações)
        BigDecimal committed = installmentRepository.somarDividasComFiltro(
            userId, inicio, fim, false
        );
        if (committed == null) committed = BigDecimal.ZERO;

        // 3. Sobra projetada
        BigDecimal leftover = currentBalance.subtract(committed);

        // 4. Total a receber de empréstimos
        BigDecimal toReceive = loanRepository.totalAReceber(userId);
        if (toReceive == null) toReceive = BigDecimal.ZERO;

        // 5. Faturas de cartão pendentes
        List<InvoiceSummaryDTO> invoices = buildInvoiceSummaries(userId);

        // 6. Parcelas do mês com detalhes (checklist)
        // JOIN FETCH — uma query só, sem N+1
        List<Installment> parcelas = installmentRepository
            .findPendingWithDetailsByUserAndPeriod(userId, inicio, fim);
        List<InstallmentItemDTO> installmentItems = parcelas.stream()
            .map(this::toInstallmentItem)
            .toList();

        // 7. Status dos budgets
        List<BudgetStatusDTO> budgets = budgetService.getStatusDoMes(userId, month, year);

        // 8. Projeção de 12 meses
        List<MonthProjectionDTO> projection = buildProjection(userId, month, year);

        // 9. Verifica se tem parceiro
        boolean hasPartner = partnershipRepository.findByUserId(userId).isPresent();

        return new DashboardDTO(
            currentBalance,
            committed,
            leftover,
            toReceive,
            invoices,
            installmentItems,
            budgets,
            projection,
            hasPartner
        );
    }

    // =========================================================
    // PROJEÇÃO DE 12 MESES
    // =========================================================

    private List<MonthProjectionDTO> buildProjection(UUID userId, int startMonth, int startYear) {
        LocalDate inicio = LocalDate.of(startYear, startMonth, 1);
        LocalDate fim = inicio.plusMonths(12).with(TemporalAdjusters.lastDayOfMonth());

        // Uma query para trazer real + simulação agrupados por mês
        List<Object[]> rows = installmentRepository.projecaoPorMes(userId, inicio, fim);

        // Monta um mapa para lookup rápido: "mes-ano" → dados
        Map<String, Object[]> dataMap = rows.stream()
            .collect(Collectors.toMap(
                r -> r[0] + "-" + r[1],
                r -> r
            ));

        // Busca recorrentes — valor estimado fixo por mês
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
                real.add(simulado).add(recorrentes), // projetado total
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

        // Saldo consolidado — apenas contas marcadas como shared de ambos
        BigDecimal saldoCompartilhado = calcularSaldoCompartilhado(userId, partnerId);

        // Total comprometido do usuário (todas as contas)
        BigDecimal committedUsuario = installmentRepository.somarDividasComFiltro(
            userId, inicio, fim, false
        );
        if (committedUsuario == null) committedUsuario = BigDecimal.ZERO;

        // Total comprometido do parceiro — apenas contas shared
        BigDecimal committedParceiro = installmentRepository
            .somarDividasComFiltroEContaShared(partnerId, inicio, fim);
        if (committedParceiro == null) committedParceiro = BigDecimal.ZERO;

        BigDecimal totalCommitted = committedUsuario.add(committedParceiro);
        BigDecimal leftover = saldoCompartilhado.subtract(totalCommitted);

        // Total a receber — soma dos dois
        BigDecimal toReceive = loanRepository.totalAReceber(userId);
        if (toReceive == null) toReceive = BigDecimal.ZERO;
        BigDecimal toReceiveParceiro = loanRepository.totalAReceber(partnerId);
        if (toReceiveParceiro == null) toReceiveParceiro = BigDecimal.ZERO;

        // Faturas do usuário logado (cada um vê só as suas)
        List<InvoiceSummaryDTO> invoices = buildInvoiceSummaries(userId);

        // Parcelas do mês: as do usuário + as shared do parceiro
        List<Installment> parcelasUsuario = installmentRepository
            .findPendingWithDetailsByUserAndPeriod(userId, inicio, fim);

        List<Installment> parcelasParceiro = installmentRepository
            .findPendingSharedByPartnerAndPeriod(partnerId, inicio, fim);

        List<InstallmentItemDTO> installmentItems = Stream
            .concat(parcelasUsuario.stream(), parcelasParceiro.stream())
            .map(this::toInstallmentItem)
            .toList();

        // Budgets e projeção do usuário logado
        List<BudgetStatusDTO> budgets = budgetService.getStatusDoMes(userId, month, year);
        List<MonthProjectionDTO> projection = buildProjection(userId, month, year);

        return new DashboardDTO(
            saldoCompartilhado,
            totalCommitted,
            leftover,
            toReceive.add(toReceiveParceiro),
            invoices,
            installmentItems,
            budgets,
            projection,
            true
        );
    }

    // =========================================================
    // HELPERS PRIVADOS
    // =========================================================

    private BigDecimal calcularSaldoReal(UUID userId) {
        // Filtra apenas contas operacionais (não investimento, não cartão)
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
        // Soma saldos das contas marcadas como shared de ambos
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
            i.getPayer().getName()
        );
    }

    private BigDecimal calcularTotalRecorrentes(UUID userId) {
        return recurringRepository.findByAccountOwnerId(userId).stream()
            .filter(r -> r.getType() == TransactionType.EXPENSE) // ← só despesas
            .map(r -> r.getEstimatedAmount() != null ? r.getEstimatedAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}