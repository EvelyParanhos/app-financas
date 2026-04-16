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

    // --- Cartões de crédito ---
    private List<InvoiceSummaryDTO> pendingInvoices;  // faturas em aberto

    // --- Parcelas do mês (checklist da Home) ---
    private List<InstallmentItemDTO> installmentsDueThisMonth;

    // --- Budgets do mês ---
    private List<BudgetStatusDTO> budgetStatus;

    // --- Projeção de 12 meses ---
    private List<MonthProjectionDTO> projection;

    // --- Flag ---
    private boolean hasPartner;
}