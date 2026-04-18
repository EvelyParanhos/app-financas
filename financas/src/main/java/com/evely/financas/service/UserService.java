package com.evely.financas.service;

import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.TransactionType;
import com.evely.financas.enums.UserStatus;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.Category;
import com.evely.financas.model.User;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.CategoryRepository;
import com.evely.financas.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import com.evely.financas.enums.CategoryType;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder pe;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;

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

        // NOVIDADE: SEED DE CATEGORIAS PADRÃO (Bulletproof)
        List<Category> defaultCategories = List.of(
            buildCategory("Moradia", CategoryType.EXPENSE, savedUser),
            buildCategory("Alimentação", CategoryType.EXPENSE, savedUser),
            buildCategory("Transporte", CategoryType.EXPENSE, savedUser),
            buildCategory("Lazer", CategoryType.EXPENSE, savedUser),
            buildCategory("Saúde", CategoryType.EXPENSE, savedUser),
            buildCategory("Outros Gastos", CategoryType.EXPENSE, savedUser),
            buildCategory("Salário", CategoryType.INCOME, savedUser),
            buildCategory("Rendimentos", CategoryType.INCOME, savedUser),
            buildCategory("Vendas/Extras", CategoryType.INCOME, savedUser)
        );
        categoryRepository.saveAll(defaultCategories);

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

    // Método auxiliar para garantir a criação da categoria sem erros de Lombok
    private Category buildCategory(String name, CategoryType type, User owner) {
        Category category = new Category();
        category.setName(name);
        category.setType(type);
        category.setOwner(owner);
        return category;
    }
    
}
