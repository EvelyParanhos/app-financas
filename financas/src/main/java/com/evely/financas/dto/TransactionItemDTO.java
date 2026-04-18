package com.evely.financas.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TransactionItemDTO {
    private UUID id;
    private String description;
    private String categoryName;
    private BigDecimal amount;
    private LocalDate date;
    private String type; // EXPENSE, INCOME, TRANSFER
}