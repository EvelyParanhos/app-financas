package com.evely.financas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Account;
import com.evely.financas.model.Snapshot;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SnapshotRepository extends JpaRepository <Snapshot, UUID> {
    Optional <Snapshot> findFirstByAccountOrderBySnapshotDateDesc (Account account);
}
