package com.evely.financas.dto;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InvestmentSummaryDTO {
    private UUID accountId;
    private String accountName;
    private BigDecimal totalDeposited;   // soma de todos os aportes
    private BigDecimal totalWithdrawn;   // soma de todos os resgates
    private BigDecimal totalYield;       // soma de todos os rendimentos
    private BigDecimal currentBalance;   // totalDeposited + totalYield - totalWithdrawn
    private BigDecimal profitability;    // (totalYield / totalDeposited) * 100
}