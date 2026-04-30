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
    private BigDecimal committed;
    private BigDecimal fixedExpensesCommitted; // quanto vem de gastos fixos recorrentes
    private BigDecimal ccCommitted;            // quanto vem de faturas de cartão pendentes

    // --- Card 3: Sobra Projetada ---
    private BigDecimal projectedLeftover;   // projectedIncome - committed
    private BigDecimal projectedIncome;     // entradas previstas no mês (salário + outros INCOME)

    // --- Card 4: A Receber ---
    private BigDecimal totalToReceive;

    // --- Card 5: Investido no Mês ---
    private BigDecimal monthlyDeposits;     // aportes em investimentos no mês selecionado

    // --- Listas da Home ---
    private List<InvoiceSummaryDTO> invoices;
    private List<InstallmentItemDTO> installmentItems;
    private List<TransactionItemDTO> recentTransactions;

    // --- Extras ---
    private List<BudgetStatusDTO> budgets;
    private List<MonthProjectionDTO> projection;
    private boolean hasPartner;
    private CoupleSettlementDTO settlement;
}
