package com.evely.financas.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Budget;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, UUID> {

    // JOIN FETCH para trazer category e owner em uma query só
    @Query("""
        SELECT b FROM Budget b
        JOIN FETCH b.category
        JOIN FETCH b.owner
        WHERE b.owner.id = :userId
        AND b.referenceMonth = :month
        AND b.referenceYear = :year
    """)
    List<Budget> findByUserAndPeriod(
        @Param("userId") UUID userId,
        @Param("month") int month,
        @Param("year") int year
    );

    @Query("""
        SELECT b FROM Budget b
        JOIN FETCH b.category
        WHERE b.owner.id = :userId
        AND b.category.id = :categoryId
        AND b.referenceMonth = :month
        AND b.referenceYear = :year
    """)
    Optional<Budget> findByUserCategoryAndPeriod(
        @Param("userId") UUID userId,
        @Param("categoryId") UUID categoryId,
        @Param("month") int month,
        @Param("year") int year
    );

    // Calcula o gasto real de uma categoria no período — uma query só, sem N+1
    @Query("""
        SELECT COALESCE(SUM(i.amount), 0)
        FROM Installment i
        JOIN i.transaction t
        WHERE i.payer.id = :userId
        AND t.category.id = :categoryId
        AND t.isSimulation = false
        AND MONTH(i.dueDate) = :month
        AND YEAR(i.dueDate) = :year
        AND i.status = 'PENDING'
    """)
    java.math.BigDecimal calcularGastoPorCategoria(
        @Param("userId") UUID userId,
        @Param("categoryId") UUID categoryId,
        @Param("month") int month,
        @Param("year") int year
    );
}