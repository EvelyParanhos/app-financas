package com.evely.financas.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import com.evely.financas.enums.InstallmentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InstallmentItemDTO {
    private UUID installmentId;
    private String transactionDescription;
    private String categoryName;
    private BigDecimal amount;
    private LocalDate dueDate;
    private InstallmentStatus status;
    private boolean isSimulation;
    // Para o parceiro: de quem é essa parcela
    private String payerName;
}