package com.evely.financas.service;

import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.CategoryType;
import com.evely.financas.enums.UserStatus;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.Category;
import com.evely.financas.model.User;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.CategoryRepository;
import com.evely.financas.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import java.util.List;

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
            if (existingUser.getStatus() == UserStatus.ACTIVE) {
                throw new RuntimeException("Este e-mail já está cadastrado e ativo no sistema!");
            }
            existingUser.setPassword(pe.encode(user.getPassword()));
            existingUser.setStatus(UserStatus.PENDING);
            existingUser.setVerificationAttempts(0);
            return userRepository.save(existingUser);
        }

        user.setPassword(pe.encode(user.getPassword()));
        user.setStatus(UserStatus.PENDING);
        user.setVerificationAttempts(0);
        User savedUser = userRepository.save(user);

        // Criação automática da carteira CASH
        Account carteira = new Account();
        carteira.setName("Minha Carteira");
        carteira.setType(AccountType.CASH);
        carteira.setOwner(savedUser);
        carteira.setShared(false);
        accountRepository.save(carteira);

        // Seed de categorias padrão
        categoryRepository.saveAll(List.of(
            buildCategory("Moradia",        CategoryType.EXPENSE, savedUser),
            buildCategory("Alimentação",    CategoryType.EXPENSE, savedUser),
            buildCategory("Transporte",     CategoryType.EXPENSE, savedUser),
            buildCategory("Lazer",          CategoryType.EXPENSE, savedUser),
            buildCategory("Saúde",          CategoryType.EXPENSE, savedUser),
            buildCategory("Outros Gastos",  CategoryType.EXPENSE, savedUser),
            buildCategory("Salário",        CategoryType.INCOME,  savedUser),
            buildCategory("Rendimentos",    CategoryType.INCOME,  savedUser),
            buildCategory("Vendas/Extras",  CategoryType.INCOME,  savedUser)
        ));

        return savedUser;
    }

    /**
     * ✅ Edita apenas nome e telegramId do próprio usuário logado.
     * Separado do antigo editar(UUID, User) para evitar que alguém
     * altere dados de outro usuário passando um id arbitrário.
     */
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

    private Category buildCategory(String name, CategoryType type, User owner) {
        Category category = new Category();
        category.setName(name);
        category.setType(type);
        category.setOwner(owner);
        return category;
    }
}