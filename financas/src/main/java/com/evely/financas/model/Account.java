package com.evely.financas.model;

import java.math.BigDecimal;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.evely.financas.enums.AccountType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.*;

@Entity
@Table(name = "accounts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    private String name;

    @ManyToOne
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(name = "type")
    @Enumerated(EnumType.STRING)
    private AccountType type;

    @Column(name = "closing_day")
    private Integer closingDay;

    @Column(name = "due_day")
    private Integer dueDay;

    @Column(name = "card_limit")
    private BigDecimal cardLimit;

    @Column(name = "is_shared")
    private boolean shared;

    /**
     * ✅ NOVO: Saldo atual da conta — fonte única de verdade para CHECKING, CASH e CREDIT_CARD.
     *
     * CHECKING / CASH:    saldo disponível em reais.
     * CREDIT_CARD:        limite disponível (cardLimit - valor usado na fatura aberta).
     *                     Diminui quando uma compra é registrada no cartão.
     *                     Aumenta quando a fatura é paga.
     * INVESTMENT:         NÃO usa esta coluna. Saldo é calculado via InvestmentEntry
     *                     (aportes + rendimentos - resgates) para manter rastreabilidade.
     *
     * A coluna foi adicionada para substituir a tabela snapshots como
     * "fonte de saldo atual", permitindo updates atômicos no banco
     * e eliminando race conditions de leitura-modificação-escrita.
     *
     * ddl-auto=update adiciona a coluna automaticamente no próximo start.
     */
    @Column(name = "balance", nullable = false)
    private BigDecimal balance = BigDecimal.ZERO;

    /**
     * Campo transiente: não é persistido.
     * Usado no onboarding para informar o saldo inicial da conta.
     */
    @Transient
    private BigDecimal initialBalance;
}