package com.evely.financas.controller;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.enums.AccountType;
import com.evely.financas.model.Account;
import com.evely.financas.model.RecurringTransaction;
import com.evely.financas.model.User;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.RecurringTransactionRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/recurring")
@RequiredArgsConstructor
public class RecurringTransactionController {

    private final RecurringTransactionRepository recurringRepository;
    private final AccountRepository accountRepository;

    @PostMapping
    public ResponseEntity<RecurringTransaction> criar(
            @RequestBody RecurringTransaction rt,
            @AuthenticationPrincipal User user) {
        // Se não vier com conta, associa à carteira padrão
        if (rt.getAccount() == null) {
            Account carteira = accountRepository
                .findByOwnerId(user.getId())
                .stream()
                .filter(a -> a.getType() == AccountType.CASH)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Carteira não encontrada"));
            rt.setAccount(carteira);
        }
        return ResponseEntity.status(201).body(recurringRepository.save(rt));
    }

    @GetMapping
    public ResponseEntity<List<RecurringTransaction>> listar(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(recurringRepository.findByAccountOwnerId(user.getId()));
    }
}
