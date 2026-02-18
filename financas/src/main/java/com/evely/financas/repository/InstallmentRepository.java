package com.evely.financas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Installment;

@Repository
public interface InstallmentRepository extends JpaRepository <Installment, Integer> {
    
}
