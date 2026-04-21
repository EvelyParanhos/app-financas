package com.evely.financas.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.CategoryType;
import com.evely.financas.model.Account;
import com.evely.financas.model.Category;
import com.evely.financas.model.User;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;

/**
 * Responsável por configurar o ambiente inicial de um novo usuário.
 * Chamado pelo UserService logo após o primeiro save do usuário.
 *
 * Separado do UserService para respeitar Single Responsibility:
 * UserService cuida do ciclo de vida do usuário (criar, editar, excluir).
 * OnboardingService cuida da estrutura inicial (contas e categorias padrão).
 */
@Service
@RequiredArgsConstructor
public class OnboardingService {

    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;

    @Transactional
    public void configurarNovoUsuario(User user) {
        criarCarteiraInicial(user);
        criarCategoriasPadrao(user);
    }

    // -------------------------------------------------------------------------
    // PRIVADOS
    // -------------------------------------------------------------------------

    private void criarCarteiraInicial(User user) {
        Account carteira = new Account();
        carteira.setName("Minha Carteira");
        carteira.setType(AccountType.CASH);
        carteira.setOwner(user);
        carteira.setShared(false);
        accountRepository.save(carteira);
    }

    private void criarCategoriasPadrao(User user) {
        categoryRepository.saveAll(List.of(
            build("Moradia",       CategoryType.EXPENSE, user, "house",       "#6366F1"),
            build("Alimentação",   CategoryType.EXPENSE, user, "utensils",    "#F59E0B"),
            build("Transporte",    CategoryType.EXPENSE, user, "car",         "#3B82F6"),
            build("Lazer",         CategoryType.EXPENSE, user, "gamepad-2",   "#8B5CF6"),
            build("Saúde",         CategoryType.EXPENSE, user, "heart",       "#EF4444"),
            build("Outros Gastos", CategoryType.EXPENSE, user, "wallet",      "#6B7280"),
            build("Salário",       CategoryType.INCOME,  user, "banknote",    "#10B981"),
            build("Rendimentos",   CategoryType.INCOME,  user, "trending-up", "#059669"),
            build("Vendas/Extras", CategoryType.INCOME,  user, "tag",         "#0EA5E9")
        ));
    }

    private Category build(String name, CategoryType type, User owner,
                           String icon, String color) {
        Category c = new Category();
        c.setName(name);
        c.setType(type);
        c.setOwner(owner);
        c.setIcon(icon);
        c.setColor(color);
        c.setActive(true);
        return c;
    }
}