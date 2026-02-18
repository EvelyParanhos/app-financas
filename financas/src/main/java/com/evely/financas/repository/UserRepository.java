package com.evely.financas.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.User;

@Repository
public interface UserRepository extends JpaRepository <User, Integer> {
    Optional<User> findByTelegramId(String telegramId);
}
