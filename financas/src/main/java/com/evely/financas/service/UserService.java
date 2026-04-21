package com.evely.financas.service;

import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.dto.CadastroDTO;
import com.evely.financas.enums.UserStatus;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.User;
import com.evely.financas.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder pe;
    private final OnboardingService onboardingService;

    // ✅ Recebe CadastroDTO — nunca expõe a entidade User diretamente
    @Transactional
    public User salvar(CadastroDTO dto) {
        if (userRepository.existsByEmail(dto.email())) {
            User existente = userRepository.findByEmail(dto.email()).get();
            if (existente.getStatus() == UserStatus.ACTIVE) {
                throw new RuntimeException("Este e-mail já está cadastrado e ativo no sistema!");
            }
            // Re-cadastro de conta PENDING: atualiza senha e reseta estado
            existente.setPassword(pe.encode(dto.password()));
            existente.setStatus(UserStatus.PENDING);
            existente.setVerificationAttempts(0);
            return userRepository.save(existente);
        }

        User user = new User();
        user.setName(dto.name());
        user.setEmail(dto.email());
        user.setPassword(pe.encode(dto.password()));
        user.setStatus(UserStatus.PENDING);
        user.setVerificationAttempts(0);

        User savedUser = userRepository.save(user);

        // ✅ Responsabilidade delegada — UserService não conhece mais Account/Category
        onboardingService.configurarNovoUsuario(savedUser);

        return savedUser;
    }

    public User editarPerfil(UUID id, String name, String telegramId) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado!"));
        user.setName(name);
        user.setTelegramId(telegramId);
        return userRepository.save(user);
    }

    public void excluir(UUID id) {
        userRepository.deleteById(id);
    }

    public User buscarPorEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado"));
    }
}