package com.evely.financas.model;

import java.math.BigDecimal;
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
import lombok.*;

@Entity
@Table (name = "accounts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Account {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column (name = "id_account")
    private Integer id;

    private String name;

    @ManyToOne
    @JoinColumn (name = "owner_id")
    private User owner;

    @Column (name = "type")
    @Enumerated(EnumType.STRING)
    private AccountType type;

    @Column (name = "closing_day")
    private int closingDay;

    @Column (name = "due_day")
    private int dueDay;

    @Column (name = "card_limit")
    private BigDecimal cardLimit;
}
