package com.evely.financas.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AccountBalanceDTO {
    private String name;
    private String type;       // "CASH" ou "CHECKING"
    private BigDecimal balance;
}