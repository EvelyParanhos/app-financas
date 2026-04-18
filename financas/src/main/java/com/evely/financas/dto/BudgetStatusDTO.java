package com.evely.financas.dto;

import java.math.BigDecimal;
import java.util.UUID;
import com.evely.financas.enums.AlertStatus; // Importa o seu Enum de status
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
    private BigDecimal remainingAmount;
    private double percentageUsed; // Se no seu service for Double, troque aqui para Double
    private AlertStatus status; // Se no seu service for String, troque aqui para String

}