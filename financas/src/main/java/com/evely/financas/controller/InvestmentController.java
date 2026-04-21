package com.evely.financas.controller;

import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.evely.financas.dto.InvestmentEntryDTO;
import com.evely.financas.dto.InvestmentProjectionDTO;
import com.evely.financas.dto.InvestmentSummaryDTO;
import com.evely.financas.model.InvestmentEntry;
import com.evely.financas.model.User;
import com.evely.financas.service.InvestmentProjectionService;
import com.evely.financas.service.InvestmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/investments")
@RequiredArgsConstructor
public class InvestmentController {

    private final InvestmentService investmentService;
    private final InvestmentProjectionService investmentProjectionService;

    /** Lança aporte, resgate ou rendimento. */
    @PostMapping("/entry")
    public ResponseEntity<InvestmentEntry> lancarEntrada(
            @Valid @RequestBody InvestmentEntryDTO dto,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(201)
            .body(investmentService.lancarEntrada(dto, user.getId()));
    }

    /** Resumo de todas as contas de investimento (próprias + compartilhadas). */
    @GetMapping("/summary")
    public ResponseEntity<List<InvestmentSummaryDTO>> resumoGeral(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(investmentService.getResumoGeral(user.getId()));
    }

    /** Resumo de uma conta específica. */
    @GetMapping("/summary/{accountId}")
    public ResponseEntity<InvestmentSummaryDTO> resumoConta(
            @PathVariable UUID accountId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(investmentService.getResumo(accountId, user.getId()));
    }

    /** Histórico de lançamentos de uma conta. */
    @GetMapping("/history/{accountId}")
    public ResponseEntity<List<InvestmentEntry>> historico(
            @PathVariable UUID accountId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(investmentService.getHistorico(accountId, user.getId()));
    }

    /**
     * Projeção de crescimento dos investimentos para os próximos 12 meses.
     * Considera os aportes mensais fixos configurados como transações recorrentes.
     *
     * GET /api/investments/projection
     * GET /api/investments/projection?months=24  (opcional, padrão=12)
     *
     * Cenário suportado:
     *   "Eu e meu marido depositamos R$500 cada um na mesma reserva todo dia 5.
     *    O sistema projeta o saldo para os próximos meses considerando R$1.000/mês."
     */
    @GetMapping("/projection")
    public ResponseEntity<List<InvestmentProjectionDTO>> projecao(
            @RequestParam(defaultValue = "12") int months,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
            investmentProjectionService.projetarCrescimento(user.getId(), months));
    }
}