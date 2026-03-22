package com.evely.financas.model;

import java.math.BigDecimal;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
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
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "recurring_transactions")
@NoArgsConstructor
@AllArgsConstructor
@Data
public class RecurringTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column (name = "id", updatable = false, nullable = false)
    private UUID id;

    private String description; 
    
    @Column (name = "estimated_amount")
    private BigDecimal estimatedAmount; 

    @Column (name = "day_of_month")
    private int dayOfMonth; 

    @Enumerated(EnumType.STRING)
    private TransactionType type; 

    @ManyToOne
    @JoinColumn(name = "account_id")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private Account account; 

    @ManyToOne
    @JoinColumn(name = "category_id")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private Category category;

    @Column (name = "is_variable")
    private boolean isVariable;
}

