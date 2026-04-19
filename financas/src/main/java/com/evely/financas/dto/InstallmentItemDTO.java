package com.evely.financas.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import com.evely.financas.enums.InstallmentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class InstallmentItemDTO {
    private UUID installmentId;
    private String transactionDescription;
    private String categoryName;
    private BigDecimal amount;
    private LocalDate dueDate;
    private InstallmentStatus status;
    private boolean isSimulation;
    private String payerName;
    // null para parcelas reais; preenchido para recorrentes virtuais (não materializados ainda)
    private UUID recurringTransactionId;
}