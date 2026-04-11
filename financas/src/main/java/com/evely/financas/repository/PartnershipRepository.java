package com.evely.financas.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Partnership;

@Repository
public interface PartnershipRepository extends JpaRepository <Partnership, UUID> {
    @Query("SELECT p FROM Partnership p WHERE p.userA.id = :userId OR p.userB.id = :userId")
    Optional<Partnership> findByUserId(UUID userId);
}
