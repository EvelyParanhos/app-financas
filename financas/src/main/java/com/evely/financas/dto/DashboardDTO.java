package com.evely.financas.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DashboardDTO {

    // --- Card 1: Saldo ---
    private BigDecimal currentBalance;
    private List<AccountBalanceDTO> accountBreakdown; // detalhamento por conta corrente/carteira

    // --- Card 2: Comprometido ---
    private BigDecimal committedAmount;
    private BigDecimal fixedExpensesCommitted; // quanto vem de gastos fixos recorrentes
    private BigDecimal creditCardCommitted;    // quanto vem de faturas de cartão pendentes

    // --- Card 3: Sobra Projetada ---
    private BigDecimal projectedLeftover;   // projectedIncome - committedAmount
    private BigDecimal projectedIncome;     // entradas previstas no mês (salário + outros INCOME)

    // --- Card 4: A Receber ---
    private BigDecimal totalToReceive;

    // --- Card 5: Investido no Mês ---
    private BigDecimal monthlyDeposits;     // aportes em investimentos no mês selecionado

    // --- Listas da Home ---
    private List<InvoiceSummaryDTO> pendingInvoices;
    private List<InstallmentItemDTO> installmentsDueThisMonth;
    private List<TransactionItemDTO> recentTransactions;

    // --- Extras ---
    private List<BudgetStatusDTO> budgetStatus;
    private List<MonthProjectionDTO> projection;
    private boolean hasPartner;
}