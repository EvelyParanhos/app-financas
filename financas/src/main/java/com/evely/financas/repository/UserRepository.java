package com.evely.financas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.User;

@Repository
public interface UserRepository extends JpaRepository <User, Integer> {
    
}
