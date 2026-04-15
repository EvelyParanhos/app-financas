package com.evely.financas.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.evely.financas.enums.LoanStatus;
import com.evely.financas.model.Loan;

@Repository
public interface LoanRepository extends JpaRepository<Loan, UUID> {

    List<Loan> findByLenderIdAndStatusAndSelfLoanFalse(UUID lenderId, LoanStatus status);

    List<Loan> findByLenderIdAndStatusAndSelfLoanTrue(UUID lenderId, LoanStatus status);

    @Query("""
        SELECT l FROM Loan l
        WHERE l.lender.id = :userId
        AND l.status = 'ACTIVE'
        ORDER BY l.createdAt DESC
    """)
    List<Loan> findActiveLoansByUser(@Param("userId") UUID userId);

    @Query("""
        SELECT SUM(l.totalAmount - l.paidAmount)
        FROM Loan l
        WHERE l.lender.id = :userId
        AND l.status = 'ACTIVE'
        AND l.selfLoan = false
    """)
    java.math.BigDecimal totalAReceber(@Param("userId") UUID userId);
}