package com.evely.financas.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.User;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository <User, UUID> {
    Optional<User> findByTelegramId(String telegramId);
    Optional<User> findByInviteCode(String codigo);
    boolean existsByEmail(String email);
}
