package com.evely.financas.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Projeção mensal do patrimônio investido.
 *
 * Permite que o casal veja como a reserva vai crescer nos próximos 12 meses
 * considerando os aportes mensais fixos configurados como transações recorrentes.
 *
 * Exemplo de uso:
 *   - Evely deposita R$500/mês → recurringTransaction linked to Reserva (INVESTMENT)
 *   - Marido deposita R$500/mês → recurringTransaction linked to Reserva (INVESTMENT)
 *   - Sistema projeta: mês 1 = saldo atual + R$1.000, mês 2 = + R$2.000, etc.
 */
@Data
@AllArgsConstructor
public class InvestmentProjectionDTO {
    private int month;
    private int year;

    /** Saldo projetado da conta de investimento neste mês. */
    private BigDecimal projectedBalance;

    /** Quanto vai ser aportado no mês (soma dos recorrentes). */
    private BigDecimal projectedDeposit;

    /** Nome da conta de investimento (para o frontend saber qual é qual). */
    private String accountName;
}