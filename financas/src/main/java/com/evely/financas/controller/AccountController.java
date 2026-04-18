package com.evely.financas.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.model.Account;
import com.evely.financas.model.User;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.service.AccountService;
import lombok.RequiredArgsConstructor;
import java.math.BigDecimal;
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
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final AccountRepository accountRepository;

    @PostMapping
    public ResponseEntity<Account> salvar(
            @RequestBody Account account,
            @AuthenticationPrincipal User user) {
        account.setOwner(user);
        Account accountSalva = accountService.salvar(account);
        return ResponseEntity.status(201).body(accountSalva);
    }

    @GetMapping
    public ResponseEntity<List<Account>> listarContas(@AuthenticationPrincipal User user) {
        List<Account> contas = accountRepository.findByOwnerId(user.getId());
        return ResponseEntity.ok(contas);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        Account conta = accountRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        if (!conta.getOwner().getId().equals(user.getId()))
            throw new RuntimeException("Sem permissão para excluir esta conta.");
        accountService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Account> editar(
            @PathVariable UUID id,
            @RequestBody Account account,
            @AuthenticationPrincipal User user) {
        Account existente = accountRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        if (!existente.getOwner().getId().equals(user.getId()))
            throw new RuntimeException("Sem permissão para editar esta conta.");
        Account atualizada = accountService.editar(id, account);
        return ResponseEntity.ok(atualizada);
    }

    @PatchMapping("/{accountId}/visibility")
    public ResponseEntity<Void> toggleVisibility(
            @PathVariable UUID accountId,
            @AuthenticationPrincipal User user) {
        Account conta = accountRepository.findById(accountId)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        if (!conta.getOwner().getId().equals(user.getId()))
            throw new RuntimeException("Sem permissão.");
        conta.setShared(!conta.isShared());
        accountRepository.save(conta);
        return ResponseEntity.ok().build();
    }

    /**
     * Define (ou corrige) o saldo atual de uma conta.
     * Usado principalmente no onboarding para informar quanto o usuário
     * já tem em cada conta no momento do cadastro, incluindo a carteira CASH
     * criada automaticamente no registro.
     *
     * PATCH /api/accounts/{id}/balance?amount=1500.00
     */
    @PatchMapping("/{id}/balance")
    public ResponseEntity<Void> definirSaldoInicial(
            @PathVariable UUID id,
            @RequestParam BigDecimal amount,
            @AuthenticationPrincipal User user) {
        accountService.definirSaldoInicial(id, amount, user.getId());
        return ResponseEntity.ok().build();
    }
}