package com.evely.financas.model;

import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.evely.financas.enums.UserStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue (strategy = GenerationType.UUID)
    @Column (name = "id", updatable = false, nullable = false)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID id;

    private String name;

    @Column (name = "telegram_id")
    private String telegramId;

    @Email(message = "Por favor, insira um e-mail válido.")
    @NotBlank(message = "O e-mail é obrigatório.")
    private String email;

    private String password;

    @Enumerated(EnumType.STRING)
    private UserStatus status;

    @Column (name = "verification_code")
    private String verificationCode;

    @Column (name = "verification_attempts")
    private Integer verificationAttempts;

    @Column (name = "verification_expiry")
    private LocalDateTime verificationExpiry;

    @Column (name = "last_resend_at")
    private LocalDateTime lastResendAt;

    
    @Column (name = "invite_expiry")
    private LocalDateTime inviteExpiry;
    

    @Column(name = "invite_code", unique = true)
    private String inviteCode;
}
