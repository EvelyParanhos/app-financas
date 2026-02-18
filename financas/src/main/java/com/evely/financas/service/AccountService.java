package com.evely.financas.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.evely.financas.model.Account;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccountService {
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public Account salvar (Account account) {
        Integer ownerId = account.getOwner().getId();

        userRepository.findById(ownerId)
            .orElseThrow(()->new RuntimeException("Não foi possível criar a conta: Usuário dono não encontrado!"));
        
        Account salva = accountRepository.save(account);
        return accountRepository.findById(salva.getId()).get();
    }

    public List<Account> listarTodas() {
        return accountRepository.findAll();
    }

    public void excluir(Integer id) {
        accountRepository.deleteById(id);
    }

    public Account editar (Integer id, Account accountAtualizada) {
        Account accountExistente = accountRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada com o ID: " + id));
            
        accountExistente.setName(accountAtualizada.getName());
        accountExistente.setType(accountAtualizada.getType());
        accountExistente.setClosingDay(accountAtualizada.getClosingDay());
        accountExistente.setDueDay(accountAtualizada.getDueDay());
        accountExistente.setCardLimit(accountAtualizada.getCardLimit());
        accountExistente.setOwner(accountAtualizada.getOwner());

        return accountRepository.save(accountExistente);
    }
}
