package com.evely.financas.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.evely.financas.dto.LoanOutDTO;
import com.evely.financas.dto.SelfLoanDTO;
import com.evely.financas.model.Loan;
import com.evely.financas.model.User;
import com.evely.financas.service.LoanService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/loans")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;

    @PostMapping("/out")
    public ResponseEntity<Loan> emprestar(
            @RequestBody LoanOutDTO dto,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(201).body(
            loanService.emprestarParaTerceiro(dto, user.getId())
        );
    }

    @PostMapping("/self")
    public ResponseEntity<Loan> autoEmprestimo(
            @RequestBody SelfLoanDTO dto,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(201).body(
            loanService.criarAutoEmprestimo(dto, user.getId())
        );
    }

    @PostMapping("/{loanId}/receive")
    public ResponseEntity<Loan> registrarRecebimento(
            @PathVariable UUID loanId,
            @RequestParam BigDecimal valor) {
        return ResponseEntity.ok(loanService.registrarRecebimento(loanId, valor));
    }

    @PostMapping("/{loanId}/forgive")
    public ResponseEntity<Loan> perdoar(
            @PathVariable UUID loanId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(loanService.perdoarEmprestimo(loanId, user.getId()));
    }

    @GetMapping
    public ResponseEntity<List<Loan>> listar(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(loanService.listarEmprestimosAtivos(user.getId()));
    }

    @GetMapping("/total-a-receber")
    public ResponseEntity<BigDecimal> totalAReceber(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(loanService.totalAReceber(user.getId()));
    }
}