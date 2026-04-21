package com.evely.financas.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Account;

@Repository
public interface AccountRepository extends JpaRepository<Account, UUID> {

    List<Account> findByOwnerId(UUID userId);

    List<Account> findByOwnerIdAndSharedTrue(UUID userId);

    // =========================================================
    // ✅ NOVO: Updates atômicos de saldo
    //
    // Por que não usar save(account)?
    // Em concorrência, dois threads lendo o mesmo account.balance
    // e salvando podem causar inconsistência (lost update problem).
    // Estas queries executam direto no banco em uma única instrução,
    // garantindo atomicidade sem precisar de locks explícitos.
    // =========================================================

    /**
     * Decrementa o saldo APENAS se houver saldo suficiente.
     * Retorna 1 se o update aconteceu, 0 se saldo insuficiente.
     * A condição `balance >= :valor` é verificada atomicamente no banco.
     */
    @Modifying
    @Query("UPDATE Account a SET a.balance = a.balance - :valor WHERE a.id = :id AND a.balance >= :valor")
    int decrementBalance(@Param("id") UUID id, @Param("valor") BigDecimal valor);

    /**
     * Incrementa o saldo sem validação de limite (usado para créditos/entradas).
     */
    @Modifying
    @Query("UPDATE Account a SET a.balance = a.balance + :valor WHERE a.id = :id")
    int incrementBalance(@Param("id") UUID id, @Param("valor") BigDecimal valor);

    /**
     * Define o saldo diretamente.
     * Usado no onboarding (saldo inicial) e correções administrativas.
     */
    @Modifying
    @Query("UPDATE Account a SET a.balance = :valor WHERE a.id = :id")
    int setBalance(@Param("id") UUID id, @Param("valor") BigDecimal valor);
}