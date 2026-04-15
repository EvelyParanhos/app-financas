package com.evely.financas.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import com.evely.financas.enums.InvestmentEntryType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record InvestmentEntryDTO(
    @NotNull UUID accountId,
    @NotNull InvestmentEntryType type,
    @NotNull @Positive BigDecimal amount,
    @NotNull LocalDate entryDate,
    String notes
) {}