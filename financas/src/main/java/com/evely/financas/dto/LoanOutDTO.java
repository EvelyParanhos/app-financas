package com.evely.financas.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record LoanOutDTO(
    UUID sourceAccountId,
    String borrowerName,       
    UUID borrowerUserId,   
    BigDecimal totalAmount,
    LocalDate expectedReturnDate,
    String notes
) {}