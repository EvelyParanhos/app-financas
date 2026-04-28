package com.evely.financas.controller;

import org.springframework.web.bind.annotation.*;
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
        return ResponseEntity.status(201).body(accountService.salvar(account));
    }

    /**
     * ✅ ITEM 10: Parâmetro opcional includePartner.
     *
     * GET /api/accounts                      — apenas as contas do usuário
     * GET /api/accounts?includePartner=true  — contas do usuário + contas
     *                                          compartilhadas do parceiro
     *
     * Uso típico: formulário de nova transação, onde o usuário precisa
     * ver as contas compartilhadas do casal para lançar nelas.
     */
    @GetMapping
    public ResponseEntity<List<Account>> listarContas(
            @RequestParam(defaultValue = "false") boolean includePartner,
            @AuthenticationPrincipal User user) {

        if (includePartner) {
            return ResponseEntity.ok(accountService.listarComParceiroOpcional(user.getId()));
        }
        return ResponseEntity.ok(accountRepository.findByOwnerId(user.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        Account conta = accountRepository.findByIdAndActiveTrue(id)
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
        Account existente = accountRepository.findByIdAndActiveTrue(id)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        if (!existente.getOwner().getId().equals(user.getId()))
            throw new RuntimeException("Sem permissão para editar esta conta.");
        return ResponseEntity.ok(accountService.editar(id, account));
    }

    @PatchMapping("/{accountId}/visibility")
    public ResponseEntity<Void> toggleVisibility(
            @PathVariable UUID accountId,
            @AuthenticationPrincipal User user) {
        Account conta = accountRepository.findByIdAndActiveTrue(accountId)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        if (!conta.getOwner().getId().equals(user.getId()))
            throw new RuntimeException("Sem permissão.");
        conta.setShared(!conta.isShared());
        accountRepository.save(conta);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/balance")
    public ResponseEntity<Void> definirSaldoInicial(
            @PathVariable UUID id,
            @RequestParam BigDecimal amount,
            @AuthenticationPrincipal User user) {
        accountService.definirSaldoInicial(id, amount, user.getId());
        return ResponseEntity.ok().build();
    }
}
