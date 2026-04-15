package com.evely.financas.controller;

import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.evely.financas.dto.InvestmentEntryDTO;
import com.evely.financas.dto.InvestmentSummaryDTO;
import com.evely.financas.model.InvestmentEntry;
import com.evely.financas.model.User;
import com.evely.financas.service.InvestmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/investments")
@RequiredArgsConstructor
public class InvestmentController {

    private final InvestmentService investmentService;

    // Lança aporte, resgate ou rendimento
    @PostMapping("/entry")
    public ResponseEntity<InvestmentEntry> lancarEntrada(
            @Valid @RequestBody InvestmentEntryDTO dto,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(201)
            .body(investmentService.lancarEntrada(dto, user.getId()));
    }

    // Resumo de todas as contas de investimento do usuário
    @GetMapping("/summary")
    public ResponseEntity<List<InvestmentSummaryDTO>> resumoGeral(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(investmentService.getResumoGeral(user.getId()));
    }

    // Resumo de uma conta específica
    @GetMapping("/summary/{accountId}")
    public ResponseEntity<InvestmentSummaryDTO> resumoConta(
            @PathVariable UUID accountId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(investmentService.getResumo(accountId, user.getId()));
    }

    // Histórico de lançamentos de uma conta
    @GetMapping("/history/{accountId}")
    public ResponseEntity<List<InvestmentEntry>> historico(
            @PathVariable UUID accountId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(investmentService.getHistorico(accountId, user.getId()));
    }
}