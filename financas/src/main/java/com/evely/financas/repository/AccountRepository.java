package com.evely.financas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Account;

@Repository
public interface AccountRepository extends JpaRepository <Account, Integer> {
    
}
