package com.evely.financas.service;

import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.evely.financas.enums.UserStatus;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import com.evely.financas.model.User;

@Service
@RequiredArgsConstructor
public class VerificationService {

    private final UserRepository userRepository;

    @Transactional
    public void validarCodigo(UUID userId, String codigoInformado) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado"));

        // 1. Verificar se está bloqueado
        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new ObjectNotFoundException("Conta bloqueada por excesso de tentativas. Contate o suporte.");
        }

        // 2. Verificar expiração (2 minutos)
        if (user.getVerificationExpiry().isBefore(LocalDateTime.now())) {
            throw new ObjectNotFoundException("O código expirou! Solicite um novo.");
        }

        // 3. Validar código e tentativas
        if (user.getVerificationCode().equals(codigoInformado)) {
            user.setStatus(UserStatus.ACTIVE);
            user.setVerificationAttempts(0); // Reseta tentativas
            user.setVerificationCode(null);  // Limpa o código usado
        } else {
            user.setVerificationAttempts(user.getVerificationAttempts() + 1);
            
            if (user.getVerificationAttempts() >= 5) {
                user.setStatus(UserStatus.BLOCKED);
                throw new ObjectNotFoundException("Limite de tentativas excedido! Conta bloqueada.");
            }
            throw new ObjectNotFoundException("Código incorreto! Tentativas: " + user.getVerificationAttempts() + "/5");
        }
        userRepository.save(user);
    }

    @Transactional
    public String solicitarNovoCodigo(UUID userId) {
        User user = userRepository.findById(userId).get();

        // 4. Trava de 30 segundos para reenvio
        if (user.getLastResendAt() != null && 
            user.getLastResendAt().plusSeconds(30).isAfter(LocalDateTime.now())) {
            throw new ObjectNotFoundException("Aguarde 30 segundos para solicitar um novo código.");
        }

        // Gera novo código de 6 dígitos
        String novoCodigo = String.valueOf((int)(Math.random() * 900000) + 100000);
        
        user.setVerificationCode(novoCodigo);
        user.setVerificationExpiry(LocalDateTime.now().plusMinutes(2)); // Expira em 2m
        user.setLastResendAt(LocalDateTime.now());
        
        userRepository.save(user);
        return novoCodigo; // Aqui você chamaria o serviço de e-mail para enviar
    }
}