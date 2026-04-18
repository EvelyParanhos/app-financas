package com.evely.financas.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.model.Account;
import com.evely.financas.model.User;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.service.AccountService;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;


@RestController
@RequestMapping("api/accounts")
@RequiredArgsConstructor

public class AccountController {
    private final AccountService accountService;
    private final AccountRepository accountRepository;

    // AccountController.java
    @PostMapping
    public ResponseEntity<Account> salvar(
            @RequestBody Account account,
            @AuthenticationPrincipal User user) {  // ← adicione isso
        account.setOwner(user);                    // ← e isso
        Account accountSalva = accountService.salvar(account);
        return ResponseEntity.status(201).body(accountSalva);
    }

    @GetMapping
    public ResponseEntity<List<Account>> listarContas(@AuthenticationPrincipal User user) {
        List<Account> contas = accountRepository.findByOwnerId(user.getId());
        return ResponseEntity.ok(contas);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        accountService.excluir(id);
        return ResponseEntity.noContent().build(); 
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Account> editar(@PathVariable UUID id, @RequestBody Account account) {
        Account atualizada = accountService.editar(id, account);
        return ResponseEntity.ok(atualizada);
    }

    @PatchMapping("/{accountId}/visibility")
    public ResponseEntity<Void> toggleVisibility(@PathVariable UUID accountId) {
        Account conta = accountRepository.findById(accountId)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
    
        conta.setShared(!conta.isShared());
        accountRepository.save(conta);
    
    return ResponseEntity.ok().build();
    }
}
