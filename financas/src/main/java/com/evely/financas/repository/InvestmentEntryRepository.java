package com.evely.financas.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.evely.financas.enums.InvestmentEntryType;
import com.evely.financas.model.InvestmentEntry;

@Repository
public interface InvestmentEntryRepository extends JpaRepository<InvestmentEntry, UUID> {

    List<InvestmentEntry> findByAccountIdOrderByEntryDateDesc(UUID accountId);

    // Soma por tipo para uma conta específica
    @Query("""
        SELECT COALESCE(SUM(e.amount), 0)
        FROM InvestmentEntry e
        WHERE e.account.id = :accountId
        AND e.type = :type
    """)
    BigDecimal sumByAccountAndType(
        @Param("accountId") UUID accountId,
        @Param("type") InvestmentEntryType type
    );

    // Todas as entradas de todas as contas de investimento de um usuário
    @Query("""
        SELECT e FROM InvestmentEntry e
        WHERE e.account.owner.id = :userId
        ORDER BY e.entryDate DESC
    """)
    List<InvestmentEntry> findAllByUserId(@Param("userId") UUID userId);

    // Histórico mensal para o gráfico de desempenho
    @Query("""
        SELECT YEAR(e.entryDate), MONTH(e.entryDate),
               SUM(CASE WHEN e.type = 'DEPOSIT' THEN e.amount ELSE 0 END),
               SUM(CASE WHEN e.type = 'WITHDRAWAL' THEN e.amount ELSE 0 END),
               SUM(CASE WHEN e.type = 'YIELD' THEN e.amount ELSE 0 END)
        FROM InvestmentEntry e
        WHERE e.account.id = :accountId
        GROUP BY YEAR(e.entryDate), MONTH(e.entryDate)
        ORDER BY YEAR(e.entryDate) DESC, MONTH(e.entryDate) DESC
    """)
    List<Object[]> monthlyHistoryByAccount(@Param("accountId") UUID accountId);
}