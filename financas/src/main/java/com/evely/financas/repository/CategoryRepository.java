package com.evely.financas.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Category;
import com.evely.financas.model.User;

@Repository
public interface CategoryRepository extends JpaRepository <Category, UUID> {
    List<Category> findByOwnerAndActiveTrue(User owner);
}