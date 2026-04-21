package com.evely.financas.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * DTO para criação de auto-empréstimo (RN11).
 *
 * QUANDO USAR ESTE ENDPOINT:
 *   - Quando você retirou dinheiro da reserva/investimento COM intenção de repor.
 *   - O sistema cria um "contrato de reposição" (parcelas INTERNAL_REPAYMENT).
 *
 * QUANDO NÃO USAR (sem intenção de repor):
 *   - Registre um InvestmentEntry do tipo WITHDRAWAL diretamente via
 *     POST /api/investments/entry com type=WITHDRAWAL.
 *   - Depois registre a despesa normalmente em /api/transactions.
 *
 * MODOS DE REPOSIÇÃO (mutuamente exclusivos):
 *   a) installments preenchido → parcelas com datas e valores LIVRES (recomendado)
 *   b) totalParcelas > 0       → parcelas iguais, mensais a partir do mês seguinte
 */
public record SelfLoanDTO(

    /** Conta de ORIGEM do dinheiro (normalmente uma conta de INVESTMENT). */
    UUID sourceAccountId,

    /** Conta de DESTINO (normalmente CHECKING ou CASH — onde o dinheiro vai entrar). */
    UUID targetAccountId,

    /** Valor total retirado. */
    BigDecimal totalAmount,

    /**
     * Parcelas de reposição com datas e valores personalizados.
     * Use este campo para máxima flexibilidade (RN11).
     * Se preenchido, ignora totalParcelas.
     */
    List<RepaymentInstallmentDTO> installments,

    /**
     * Número de parcelas iguais (opcional).
     * Usado apenas se installments for nulo/vazio.
     * O sistema distribui em parcelas mensais iguais a partir do mês seguinte.
     */
    int totalParcelas,

    String notes
) {
    public record RepaymentInstallmentDTO(BigDecimal amount, LocalDate dueDate) {}
}