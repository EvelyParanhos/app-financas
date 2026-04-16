package com.evely.financas.dto;

import java.math.BigDecimal;
import java.util.UUID;
import com.evely.financas.enums.AlertStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BudgetStatusDTO {
    private UUID budgetId;
    private String categoryName;
    private BigDecimal amountLimit;
    private BigDecimal amountSpent;
    private BigDecimal amountRemaining;
    private int percentageUsed;
    private AlertStatus alertStatus;
}