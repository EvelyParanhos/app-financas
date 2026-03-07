package com.evely.financas.model;

import java.time.LocalDateTime;

import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue (strategy = GenerationType.UUID)
    @Column (name = "id_user", updatable = false, nullable = false)
    private UUID Id;

    private String name;

    @Column (name = "telegram_id")
    private String telegramId;

    @Column(name = "invite_code", unique = true)
    private String inviteCode;

    @Column(name = "invite_expiry")
    private LocalDateTime inviteExpiry;
}
