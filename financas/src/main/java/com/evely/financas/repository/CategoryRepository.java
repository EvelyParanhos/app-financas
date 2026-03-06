package com.evely.financas.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Category;

@Repository
public interface CategoryRepository extends JpaRepository <Category, UUID> {

}