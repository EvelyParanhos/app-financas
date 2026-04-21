package com.evely.financas.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import com.evely.financas.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Resposta do POST /api/transactions.
 * Contém o suficiente para o frontend atualizar a UI sem refazer o GET do dashboard.
 */
@Data
@AllArgsConstructor
public class TransactionResponseDTO {
    private UUID id;
    private String description;
    private BigDecimal totalAmount;
    private LocalDate purchaseDate;
    private UUID accountId;
    private String accountName;
    private UUID categoryId;
    private String categoryName;
    private TransactionType type;
    private boolean simulation;
    private int installmentCount;
}