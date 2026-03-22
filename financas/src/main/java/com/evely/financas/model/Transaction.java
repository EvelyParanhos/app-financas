package com.evely.financas.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.evely.financas.enums.TransactionType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table (name = "transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column (name = "id", updatable = false, nullable = false)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID id;

    private String description;

    @Column (name = "total_amount")
    private BigDecimal totalAmount;

    @Column (name = "purchase_date")
    private LocalDate purchaseDate;

    @ManyToOne
    @JoinColumn (name = "account_id")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private Account account;

    @ManyToOne
    @JoinColumn (name = "category_id")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private Category category;

    @Enumerated(EnumType.STRING)
    private TransactionType type;

    @Column (name = "is_simulation")
    private boolean isSimulation;

    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, orphanRemoval = true)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private List<Installment> installments = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "destination_account_id")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private Account destinationAccount;

    @CreationTimestamp 
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
