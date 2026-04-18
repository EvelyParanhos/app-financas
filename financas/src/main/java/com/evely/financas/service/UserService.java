package com.evely.financas.service;

import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.UserStatus;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.User;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder pe;
    private final AccountRepository accountRepository;

    public User salvar(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            User existingUser = userRepository.findByEmail(user.getEmail()).get();
            
            // Se estiver ATIVO, aí sim bloqueamos o cadastro
            if (existingUser.getStatus() == UserStatus.ACTIVE) {
                throw new ObjectNotFoundException("Este e-mail já está cadastrado e ativo no sistema!");
            }
            
            // Se estiver PENDING, nós apenas atualizamos a senha e deixamos o fluxo gerar um novo código
            existingUser.setPassword(pe.encode(user.getPassword()));
            existingUser.setStatus(UserStatus.PENDING); // ← reseta BLOCKED também
            existingUser.setVerificationAttempts(0);
            return userRepository.save(existingUser);
        }
        
        user.setPassword(pe.encode(user.getPassword()));
        user.setStatus(UserStatus.PENDING);
        user.setVerificationAttempts(0); 
        User savedUser = userRepository.save(user);
        // CRIAÇÃO AUTOMÁTICA DA CARTEIRA
        
        Account carteira = new Account();
        carteira.setName("Minha Carteira");
        carteira.setType(AccountType.CASH);
        carteira.setOwner(savedUser);
        carteira.setShared(false);
        accountRepository.save(carteira);

        return savedUser;

    }
    public List<User> listarTodos() {
        return userRepository.findAll();
    }

    public void excluir (UUID id) {
        userRepository.deleteById(id);
    }

    public User editar (UUID id, User usuarioAtualizado) {
        User usuarioExistente = userRepository.findById(id)
            .orElseThrow(()-> new ObjectNotFoundException("Usuário não encontrado!"));
        usuarioExistente.setName(usuarioAtualizado.getName());
        usuarioExistente.setTelegramId(usuarioAtualizado.getTelegramId());
        return userRepository.save(usuarioExistente);
    }
    
    public User buscarPorEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado"));
    }

    
}
