package com.evely.financas.dto;

import java.math.BigDecimal;
import java.util.UUID;
import com.evely.financas.enums.InvoiceStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InvoiceSummaryDTO {
    private UUID invoiceId;
    private String accountName;
    private int referenceMonth;
    private int referenceYear;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remaining;
    private InvoiceStatus status;
}