package com.evely.financas.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Transaction;
import jakarta.transaction.Transactional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    List<Transaction> findTop5ByAccountOwnerIdAndIsSimulationFalseOrderByPurchaseDateDesc(
        UUID ownerId
    );

    List<Transaction> findByIsSimulationTrueAndCreatedAtBefore(LocalDateTime limite);

    @Deprecated
    @Transactional
    Long deleteByIsSimulationTrueAndCreatedAtBefore(LocalDateTime dia);

    boolean existsByDescriptionAndAccountIdAndPurchaseDateBetween(
        String description, UUID accountId, LocalDate start, LocalDate end
    );

    @Query("""
        SELECT SUM(t.totalAmount) FROM Transaction t
        WHERE t.account.id = :accountId
        AND t.purchaseDate >= :inicio
        AND t.purchaseDate <= :fim
        AND t.isSimulation = false
    """)
    java.math.BigDecimal sumAmountByAccountAndPeriod(
        @Param("accountId") UUID accountId,
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );

    /**
     * Listagem com filtros opcionais — usado por GET /api/transactions.
     *
     * type e categoryId são opcionais: se nulos, não filtram.
     * Simulações são sempre excluídas.
     * Ordenado por data de compra DESC (mais recente primeiro).
     */
    @Query("""
        SELECT t FROM Transaction t
        LEFT JOIN FETCH t.category
        LEFT JOIN FETCH t.account
        WHERE t.account.owner.id = :userId
        AND t.isSimulation = false
        AND MONTH(t.purchaseDate) = :month
        AND YEAR(t.purchaseDate) = :year
        ORDER BY t.purchaseDate DESC
    """)
    List<Transaction> findComFiltros(
        @Param("userId") UUID userId,
        @Param("month") int month,
        @Param("year") int year
    );

    @Query("""
    SELECT t FROM Transaction t
    LEFT JOIN FETCH t.category
    LEFT JOIN FETCH t.account
    WHERE t.account.owner.id = :userId
    AND t.isSimulation = true
    AND MONTH(t.purchaseDate) = :month
    AND YEAR(t.purchaseDate) = :year
    ORDER BY t.createdAt DESC
    """)
    List<Transaction> findSimulacoes(
        @Param("userId") UUID userId,
        @Param("month") int month,
        @Param("year") int year
    );

}