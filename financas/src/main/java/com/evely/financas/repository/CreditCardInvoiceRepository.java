package com.evely.financas.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.evely.financas.enums.InvoiceStatus;
import com.evely.financas.model.CreditCardInvoice;

@Repository
public interface CreditCardInvoiceRepository extends JpaRepository<CreditCardInvoice, UUID> {

    Optional<CreditCardInvoice> findByAccountIdAndReferenceMonthAndReferenceYear(
        UUID accountId, int month, int year
    );

    List<CreditCardInvoice> findByAccountIdOrderByReferenceYearDescReferenceMonthDesc(
        UUID accountId
    );

    List<CreditCardInvoice> findByAccountIdAndStatus(UUID accountId, InvoiceStatus status);

    @Query("""
        SELECT i FROM CreditCardInvoice i
        WHERE i.account.owner.id = :userId
        AND i.status IN ('OPEN', 'CLOSED', 'PARTIALLY_PAID')
        ORDER BY i.referenceYear DESC, i.referenceMonth DESC
    """)
    List<CreditCardInvoice> findPendingInvoicesByUserId(@Param("userId") UUID userId);

    @Query("""
        SELECT i FROM CreditCardInvoice i
        WHERE i.status = 'OPEN'
        AND i.closingDate <= :hoje
    """)
    List<CreditCardInvoice> findAbertasVencidas(@Param("hoje") LocalDate hoje);
}