package com.evely.financas.controller;

import java.time.LocalDateTime;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.dto.AuthDTO;
import com.evely.financas.dto.TokenDTO;
import com.evely.financas.enums.UserStatus;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.exception.StandardError;
import com.evely.financas.model.User;
import com.evely.financas.repository.UserRepository;
import com.evely.financas.service.JwtService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthDTO data) {
        User user = userRepository.findByEmail(data.email()).orElse(null);
        
        // Mensagem genérica em todos os casos de falha — nunca revela o motivo
        if (user == null || !passwordEncoder.matches(data.password(), user.getPassword())) {
            return ResponseEntity.status(401).body(
                new StandardError(LocalDateTime.now(), 401, "Não autorizado", "Credenciais inválidas.", "/api/auth/login")
            );
        }
        if (user.getStatus() == UserStatus.PENDING) {
            return ResponseEntity.status(403).body(
                new StandardError(LocalDateTime.now(), 403, "Conta pendente", "Sua conta ainda não foi verificada.", "/api/auth/login")
            );
        }
        if (user.getStatus() == UserStatus.BLOCKED) {
            return ResponseEntity.status(403).body(
                new StandardError(LocalDateTime.now(), 403, "Conta bloqueada", "Conta bloqueada por excesso de tentativas.", "/api/auth/login")
            );
        }

        return ResponseEntity.ok(new TokenDTO(jwtService.gerarToken(user)));
    }
}