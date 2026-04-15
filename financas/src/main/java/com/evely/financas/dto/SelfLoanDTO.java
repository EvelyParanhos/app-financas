package com.evely.financas.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record SelfLoanDTO(
    UUID sourceAccountId, 
    UUID targetAccountId, 
    BigDecimal totalAmount,
    int parcelas,
    String notes
) {}