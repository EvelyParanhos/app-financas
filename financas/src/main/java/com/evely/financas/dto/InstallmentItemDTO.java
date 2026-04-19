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
    private UUID recurringTransactionId;

    /**
     * Tipo da transação original: EXPENSE, INCOME, LOAN_OUT, etc.
     * Permite que o frontend distinga "a pagar" de "a receber" no checklist.
     */
    private String transactionType;
}