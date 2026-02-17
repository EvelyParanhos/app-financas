package com.evely.financas.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.evely.financas.enums.TransactionType;
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
@Table (name = "transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column (name = "id_transaction")
    private Integer id;

    private String description;

    @Column (name = "total_amount")
    private BigDecimal totalAmount;

    @Column (name = "purchase_date")
    private LocalDate purchaseDate;

    @ManyToOne
    @JoinColumn (name = "account_id")
    private Account account;

    @ManyToOne
    @JoinColumn (name = "category_id")
    private Category category;

    @Enumerated(EnumType.STRING)
    private TransactionType type;

    @Column (name = "is_simulation")
    private boolean isSimulation;
    
}
