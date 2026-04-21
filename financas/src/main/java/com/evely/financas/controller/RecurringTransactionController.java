package com.evely.financas.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.evely.financas.enums.AccountType;
import com.evely.financas.model.Account;
import com.evely.financas.model.RecurringTransaction;
import com.evely.financas.model.User;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.RecurringTransactionRepository;
import com.evely.financas.service.AccountService;
import com.evely.financas.service.RecurringTransactionService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/recurring")
@RequiredArgsConstructor
public class RecurringTransactionController {

    private final RecurringTransactionRepository recurringRepository;
    private final AccountRepository accountRepository;
    private final AccountService accountService;
    private final RecurringTransactionService recurringTransactionService;

    @PostMapping
    public ResponseEntity<RecurringTransaction> criar(
            @RequestBody RecurringTransaction rt,
            @AuthenticationPrincipal User user) {

        if (rt.getAccount() == null || rt.getAccount().getId() == null) {
            // Sem conta informada: usa a carteira CASH do próprio usuário
            Account carteira = accountRepository
                .findByOwnerId(user.getId())
                .stream()
                .filter(a -> a.getType() == AccountType.CASH)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Carteira não encontrada"));
            rt.setAccount(carteira);
        } else {
            // ✅ ITEM 5: valida acesso — aceita conta própria OU conta compartilhada do parceiro
            Account conta = accountService
                .buscarContaComAcessoPermitido(rt.getAccount().getId(), user.getId());
            rt.setAccount(conta);
        }

        return ResponseEntity.status(201).body(recurringRepository.save(rt));
    }

    @GetMapping
    public ResponseEntity<List<RecurringTransaction>> listar(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(recurringRepository.findByAccountOwnerId(user.getId()));
    }

    @PostMapping("/{id}/materialize")
    public ResponseEntity<String> materializar(
            @PathVariable UUID id,
            @RequestParam int month,
            @RequestParam int year,
            @RequestParam(required = false) BigDecimal actualAmount,
            @AuthenticationPrincipal User user) {
        recurringTransactionService.materializarParaMes(id, month, year, user.getId(), actualAmount);
        return ResponseEntity.ok("Transação recorrente registrada com sucesso.");
    }
}