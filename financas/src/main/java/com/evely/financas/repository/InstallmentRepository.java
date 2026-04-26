package com.evely.financas.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.model.Installment;

@Repository
public interface InstallmentRepository extends JpaRepository<Installment, UUID> {

    @Query("""
        SELECT i FROM Installment i
        JOIN FETCH i.transaction t
        LEFT JOIN FETCH t.category
        LEFT JOIN FETCH i.payer
        WHERE i.payer.id = :userId
        AND i.dueDate BETWEEN :inicio AND :fim
        AND i.status = 'PENDING'
        ORDER BY i.dueDate ASC
    """)
    List<Installment> findPendingWithDetailsByUserAndPeriod(
        @Param("userId") UUID userId,
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );

    @Query("""
        SELECT i FROM Installment i
        JOIN FETCH i.transaction t
        LEFT JOIN FETCH t.category
        LEFT JOIN FETCH i.payer
        WHERE i.payer.id = :userId
        AND i.dueDate BETWEEN :inicio AND :fim
        AND i.invoice IS NULL
        ORDER BY i.dueDate ASC
    """)
    List<Installment> findChecklistWithDetailsByUserAndPeriod(
        @Param("userId") UUID userId,
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );

    @Query("""
        SELECT MONTH(i.dueDate), YEAR(i.dueDate),
               SUM(CASE WHEN t.isSimulation = false THEN i.amount ELSE 0 END),
               SUM(CASE WHEN t.isSimulation = true  THEN i.amount ELSE 0 END)
        FROM Installment i
        JOIN i.transaction t
        WHERE i.payer.id = :userId
        AND i.status = 'PENDING'
        AND i.dueDate BETWEEN :inicio AND :fim
        AND i.invoice IS NULL
        AND t.type NOT IN ('INCOME', 'TRANSFER', 'INTERNAL_REPAYMENT')
        GROUP BY MONTH(i.dueDate), YEAR(i.dueDate)
        ORDER BY YEAR(i.dueDate), MONTH(i.dueDate)
    """)
    List<Object[]> projecaoPorMes(
        @Param("userId") UUID userId,
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );

    @Query("""
        SELECT COALESCE(SUM(i.amount), 0)
        FROM Installment i
        WHERE i.payer.id = :userId
        AND i.status = :status
    """)
    BigDecimal somarTotalPorUsuarioEStatus(
        @Param("userId") UUID userId,
        @Param("status") InstallmentStatus status
    );

    @Query("""
        SELECT COALESCE(SUM(i.amount), 0)
        FROM Installment i
        WHERE i.payer.id = :userId
        AND i.status = :status
        AND i.dueDate BETWEEN :inicio AND :fim
    """)
    BigDecimal somarMensalPorUsuario(
        @Param("userId") UUID userId,
        @Param("status") InstallmentStatus status,
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );

    /**
     * Soma as DESPESAS pendentes do usuário no período.
     * EXCLUI: INCOME, TRANSFER e INTERNAL_REPAYMENT — esses não são dívidas.
     */
    @Query("""
        SELECT COALESCE(SUM(i.amount), 0)
        FROM Installment i
        JOIN i.transaction t
        WHERE i.payer.id = :userId
        AND i.status = 'PENDING'
        AND i.dueDate BETWEEN :inicio AND :fim
        AND i.invoice IS NULL
        AND (:incluirSimulacoes = true OR t.isSimulation = false)
        AND t.type NOT IN ('INCOME', 'TRANSFER', 'INTERNAL_REPAYMENT')
    """)
    BigDecimal somarDividasComFiltro(
        @Param("userId") UUID userId,
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim,
        @Param("incluirSimulacoes") boolean incluirSimulacoes
    );

    /**
     * Soma as RECEITAS previstas (INCOME) no período — para calcular sobra projetada.
     */
    @Query("""
        SELECT COALESCE(SUM(i.amount), 0)
        FROM Installment i
        JOIN i.transaction t
        WHERE i.payer.id = :userId
        AND i.dueDate BETWEEN :inicio AND :fim
        AND t.isSimulation = false
        AND t.type = 'INCOME'
    """)
    BigDecimal somarReceitasPrevistas(
        @Param("userId") UUID userId,
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );

    /**
     * Soma despesas pendentes de contas compartilhadas (dashboard casal).
     * Também exclui INCOME/TRANSFER/INTERNAL_REPAYMENT.
     */
    @Query("""
        SELECT COALESCE(SUM(i.amount), 0)
        FROM Installment i
        JOIN i.transaction t
        WHERE i.payer.id = :userId
        AND i.status = 'PENDING'
        AND i.dueDate BETWEEN :inicio AND :fim
        AND i.invoice IS NULL
        AND t.isSimulation = false
        AND t.account.shared = true
        AND t.type NOT IN ('INCOME', 'TRANSFER', 'INTERNAL_REPAYMENT')
    """)
    BigDecimal somarDividasComFiltroEContaShared(
        @Param("userId") UUID userId,
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );

    @Query("""
        SELECT i FROM Installment i
        JOIN FETCH i.transaction t
        LEFT JOIN FETCH t.category
        LEFT JOIN FETCH i.payer
        WHERE i.payer.id = :partnerId
        AND t.account.shared = true
        AND i.dueDate BETWEEN :inicio AND :fim
        AND i.status = 'PENDING'
        ORDER BY i.dueDate ASC
    """)
    List<Installment> findPendingSharedByPartnerAndPeriod(
        @Param("partnerId") UUID partnerId,
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );

    @Query("""
        SELECT i FROM Installment i
        JOIN FETCH i.transaction t
        LEFT JOIN FETCH t.category
        LEFT JOIN FETCH i.payer
        WHERE i.payer.id = :partnerId
        AND t.account.shared = true
        AND i.dueDate BETWEEN :inicio AND :fim
        AND i.invoice IS NULL
        ORDER BY i.dueDate ASC
    """)
    List<Installment> findChecklistSharedByPartnerAndPeriod(
        @Param("partnerId") UUID partnerId,
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );

    @Query("""
        SELECT COUNT(i) > 0 FROM Installment i
        WHERE i.transaction.id = :transactionId
        AND i.status = 'PAID'
    """)
    boolean existeParcellaPagaParaTransacao(@Param("transactionId") UUID transactionId);

    @Modifying
    @jakarta.transaction.Transactional
    @Query("DELETE FROM Installment i WHERE i.transaction.id IN (SELECT t.id FROM Transaction t WHERE t.isSimulation = true AND t.createdAt < :dia)")
    Long deleteByIsSimulationTrueAndCreatedAtBefore(@Param("dia") java.time.LocalDateTime dia);

    @Modifying
    @jakarta.transaction.Transactional
    @Query("UPDATE Installment i SET i.status = :status WHERE i.invoice.id = :invoiceId")
    int markInvoiceInstallmentsAsStatus(
        @Param("invoiceId") UUID invoiceId,
        @Param("status") InstallmentStatus status
    );
}
