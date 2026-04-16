package com.evely.financas.controller;

import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.evely.financas.dto.BudgetDTO;
import com.evely.financas.dto.BudgetStatusDTO;
import com.evely.financas.model.Budget;
import com.evely.financas.model.User;
import com.evely.financas.service.BudgetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;

    @PostMapping
    public ResponseEntity<Budget> criar(
            @Valid @RequestBody BudgetDTO dto,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(201).body(budgetService.criar(dto, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Budget> atualizar(
            @PathVariable UUID id,
            @Valid @RequestBody BudgetDTO dto,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(budgetService.atualizar(id, dto, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        budgetService.excluir(id, user);
        return ResponseEntity.noContent().build();
    }

    // Endpoint principal para a tela de gastos por categoria
    @GetMapping("/status")
    public ResponseEntity<List<BudgetStatusDTO>> status(
            @RequestParam int month,
            @RequestParam int year,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
            budgetService.getStatusDoMes(user.getId(), month, year)
        );
    }
}