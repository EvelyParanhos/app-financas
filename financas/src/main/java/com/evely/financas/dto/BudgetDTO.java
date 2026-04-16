package com.evely.financas.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

public record BudgetDTO(
    @NotNull UUID categoryId,
    @NotNull @Positive BigDecimal amountLimit,
    @Min(1) @Max(100) int alertThreshold,
    @Min(1) @Max(12) int referenceMonth,
    @Min(2000) int referenceYear
) {}