package com.evely.financas.dto;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BudgetStatusDTO {
    
    private UUID id;
    private String categoryName;
    private BigDecimal limitAmount;
    private BigDecimal spentAmount;
    private int month;
    private int year;

}