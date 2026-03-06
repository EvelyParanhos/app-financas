package com.evely.financas.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.evely.financas.enums.AccountType;
import com.evely.financas.model.Account;
import com.evely.financas.model.Snapshot;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.SnapshotRepository;
import com.evely.financas.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final SnapshotRepository snapshotRepository;

    @Transactional
    public Account salvar (Account account) {
        UUID ownerId = account.getOwner().getId();

        userRepository.findById(ownerId)
            .orElseThrow(()->new RuntimeException("Não foi possível criar a conta: Usuário dono não encontrado!"));
        
        if (account.getType() == AccountType.CREDIT_CARD) {
            Snapshot initialSnapshot = new Snapshot();
            initialSnapshot.setAccount(account);
            initialSnapshot.setAmount(account.getCardLimit());
            initialSnapshot.setSnapshotDate(LocalDateTime.now());
            snapshotRepository.save(initialSnapshot);
        }
    
        Account salva = accountRepository.save(account);
        return accountRepository.findById(salva.getId()).get();
    }


    public List<Account> listarTodas() {
        return accountRepository.findAll();
    }

    public void excluir(UUID id) {
        accountRepository.deleteById(id);
    }

    public Account editar (UUID id, Account accountAtualizada) {
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
