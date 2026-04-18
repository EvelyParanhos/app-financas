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
     * Campo transiente: não é persistido no banco.
     * Usado apenas na criação da conta para definir o saldo inicial
     * (snapshot). Permite que o usuário informe quanto já tem na conta
     * no momento do cadastro — especialmente útil no onboarding.
     */
    @Transient
    private BigDecimal initialBalance;
}