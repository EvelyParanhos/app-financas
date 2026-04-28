package com.evely.financas.model;

import java.math.BigDecimal;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.evely.financas.enums.AlertStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "budgets",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"user_id", "category_id", "reference_month", "reference_year"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    @ManyToOne
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "amount_limit", nullable = false)
    private BigDecimal amountLimit;

    // Percentual para disparar alerta (padrão: 80%)
    @Column(name = "alert_threshold", nullable = false)
    private int alertThreshold = 80;

    @Column(name = "reference_month", nullable = false)
    private int referenceMonth;

    @Column(name = "reference_year", nullable = false)
    private int referenceYear;
}
