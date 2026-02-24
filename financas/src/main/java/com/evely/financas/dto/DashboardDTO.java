package com.evely.financas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class DashboardDTO {
    private BigDecimal totalDebts;
    private BigDecimal currentBalance;
    private BigDecimal leftover;
    private boolean isProjection;
}