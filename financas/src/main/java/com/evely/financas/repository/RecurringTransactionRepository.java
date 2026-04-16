package com.evely.financas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import com.evely.financas.model.RecurringTransaction;
import java.util.List;


@Repository
public interface RecurringTransactionRepository extends JpaRepository <RecurringTransaction, UUID> {
    List<RecurringTransaction> findByDayOfMonth(int dayOfMonth);

    List<RecurringTransaction> findByAccountOwnerId(UUID userId);
}
