package com.evely.financas.dto;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CoupleSettlementDTO {
    private boolean active;
    private UUID debtorUserId;
    private String debtorName;
    private UUID creditorUserId;
    private String creditorName;
    private BigDecimal amount;
    private BigDecimal userPaidForPartner;
    private BigDecimal partnerPaidForUser;
    private String message;
}
