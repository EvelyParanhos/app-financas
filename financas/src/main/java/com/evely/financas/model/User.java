package com.evely.financas.model;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import com.evely.financas.enums.UserStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID id;

    private String name;

    @Column(name = "telegram_id")
    private String telegramId;

    @Email(message = "Por favor, insira um e-mail válido.")
    @NotBlank(message = "O e-mail é obrigatório.")
    private String email;

    // No arquivo User.java, atualize a propriedade password para ficar assim:
    @NotBlank(message = "A senha é obrigatória")
    @Size(min = 8, message = "A senha deve ter no mínimo 8 caracteres")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$", 
             message = "A senha deve conter letras, números e caracteres especiais")
    private String password;

    @Enumerated(EnumType.STRING)
    private UserStatus status;

    @Column(name = "verification_code")
    private String verificationCode;

    @Column(name = "verification_attempts")
    private Integer verificationAttempts;

    @Column(name = "verification_expiry")
    private LocalDateTime verificationExpiry;

    @Column(name = "last_resend_at")
    private LocalDateTime lastResendAt;

    @Column(name = "invite_expiry")
    private LocalDateTime inviteExpiry;

    @Column(name = "invite_code", unique = true)
    private String inviteCode;

    // -------------------------------------------------------------------------
    // UserDetails — Spring Security
    // -------------------------------------------------------------------------

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Sem roles por enquanto — lista vazia é válida e segura
        return List.of();
    }

    @Override
    public String getUsername() {
        return this.email;
    }

    // Conta só é válida se estiver ATIVA
    @Override
    public boolean isAccountNonLocked() {
        return this.status != UserStatus.BLOCKED;
    }

    // Usuário só pode autenticar se a conta estiver ativa
    @Override
    public boolean isEnabled() {
        return this.status == UserStatus.ACTIVE;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
}