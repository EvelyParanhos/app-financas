package com.evely.financas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Transaction;

@Repository
public interface TransactionRepository extends JpaRepository <Transaction, Integer> {
    
}
