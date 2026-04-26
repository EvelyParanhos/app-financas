package com.evely.financas.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.model.Installment;
import com.evely.financas.model.RecurringTransaction;
import com.evely.financas.model.User;
import com.evely.financas.service.RecurringTransactionService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/recurring")
@RequiredArgsConstructor
public class RecurringTransactionController {

    private final RecurringTransactionService recurringTransactionService;

    @PostMapping
    public ResponseEntity<RecurringTransaction> criar(
            @RequestBody RecurringTransaction rt,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(201).body(recurringTransactionService.criar(rt, user));
    }

    @GetMapping
    public ResponseEntity<List<RecurringTransaction>> listar(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(recurringTransactionService.listar(user.getId()));
    }

    @PostMapping("/{id}/materialize")
    public ResponseEntity<String> materializar(
            @PathVariable UUID id,
            @RequestParam int month,
            @RequestParam int year,
            @RequestParam(required = false) BigDecimal actualAmount,
            @AuthenticationPrincipal User user) {
        recurringTransactionService.materializarParaMes(id, month, year, user.getId(), actualAmount);
        return ResponseEntity.ok("Transacao recorrente registrada com sucesso.");
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<Installment> confirmar(
            @PathVariable UUID id,
            @RequestParam int month,
            @RequestParam int year,
            @RequestParam(required = false) BigDecimal actualAmount,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
            recurringTransactionService.confirmarParaMes(id, month, year, user.getId(), actualAmount)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecurringTransaction> editar(
            @PathVariable UUID id,
            @RequestBody RecurringTransaction rt,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(recurringTransactionService.editar(id, rt, user.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        recurringTransactionService.excluir(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}
