package com.evely.financas.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.evely.financas.enums.InstallmentStatus;
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
@Table (name = "installments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Installment {
    @Id
    @GeneratedValue (strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column (name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @JoinColumn (name = "transaction_id")
    private Transaction transaction;

    @ManyToOne
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @JoinColumn (name = "payer_id")
    private User payer;

    @Column (name = "installment_number")
    private int installmentNumber;

    @Column (name = "due_date")
    private LocalDate dueDate;

    private BigDecimal amount;

    @Enumerated (EnumType.STRING)
    private InstallmentStatus status;

}
