package com.evely.financas.repository;

import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Transaction;
import jakarta.transaction.Transactional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository <Transaction, UUID> {
    @Modifying
    @Transactional
    Long deleteByIsSimulationTrueAndCreatedAtBefore (LocalDateTime dia);
}
