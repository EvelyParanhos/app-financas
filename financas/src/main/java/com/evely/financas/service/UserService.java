package com.evely.financas.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.evely.financas.model.User;
import com.evely.financas.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    public User salvar (User user) {
        User usuarioSalvo = userRepository.save(user);
        return userRepository.findById(usuarioSalvo.getId()).get();    
    }

    public List<User> listarTodos() {
        return userRepository.findAll();
    }

    public void excluir (UUID id) {
        userRepository.deleteById(id);
    }

    public User editar (UUID id, User usuarioAtualizado) {
        User usuarioExistente = userRepository.findById(id)
            .orElseThrow(()-> new RuntimeException("Usuário não encontrado!"));
        usuarioExistente.setName(usuarioAtualizado.getName());
        usuarioExistente.setTelegramId(usuarioAtualizado.getTelegramId());
        return userRepository.save(usuarioExistente);
    }
    
}
