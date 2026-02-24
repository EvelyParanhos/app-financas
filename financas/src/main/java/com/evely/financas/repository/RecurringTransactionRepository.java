package com.evely.financas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.evely.financas.model.RecurringTransaction;
import java.util.List;


@Repository
public interface RecurringTransactionRepository extends JpaRepository <RecurringTransaction, Integer> {
    List<RecurringTransaction> findByDayOfMonth(int dayOfMonth);
}
