package com.evely.financas.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.evely.financas.enums.LoanStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "loans")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "lender_user_id", nullable = false)
    private User lender;

    @Column(name = "borrower_name")
    private String borrowerName;

    @ManyToOne
    @JoinColumn(name = "borrower_user_id")
    private User borrowerUser;

    @ManyToOne
    @JoinColumn(name = "source_account_id", nullable = false)
    private Account sourceAccount;

    @ManyToOne
    @JoinColumn(name = "target_account_id")
    private Account targetAccount;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "paid_amount", nullable = false)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "is_self_loan", nullable = false)
    private boolean selfLoan = false;

    @Column(name = "expected_return_date")
    private LocalDate expectedReturnDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanStatus status = LoanStatus.ACTIVE;

    private String notes;

    @ManyToOne
    @JoinColumn(name = "origin_transaction_id")
    private Transaction originTransaction;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
