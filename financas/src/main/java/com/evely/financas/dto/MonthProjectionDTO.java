package com.evely.financas.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MonthProjectionDTO {
    private int month;
    private int year;
    private BigDecimal projectedExpenses;   // parcelas reais + simulações
    private BigDecimal realExpenses;        // só parcelas reais
    private BigDecimal simulatedExpenses;   // só simulações
    private BigDecimal recurringExpenses;   // recorrentes estimados
}