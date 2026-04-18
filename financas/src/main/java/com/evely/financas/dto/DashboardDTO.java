package com.evely.financas.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DashboardDTO {

// --- Cards principais ---
    private BigDecimal currentBalance;        // saldo real disponível agora
    private BigDecimal committedAmount;       // total de parcelas PENDING do mês
    private BigDecimal projectedLeftover;     // currentBalance - committedAmount
    private BigDecimal totalToReceive;        // empréstimos a receber
    private BigDecimal investedBalance;       // NOVO: saldo total em contas de investimento

    // --- Listas da Home ---
    private List<InvoiceSummaryDTO> pendingInvoices;  
    private List<InstallmentItemDTO> installmentsDueThisMonth;
    private List<TransactionItemDTO> recentTransactions; // NOVO: Últimos lançamentos

    // --- Extras ---
    private List<BudgetStatusDTO> budgetStatus;
    private List<MonthProjectionDTO> projection;
    private boolean hasPartner;
}
