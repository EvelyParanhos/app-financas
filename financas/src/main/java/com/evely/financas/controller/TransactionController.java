package com.evely.financas.controller;

import org.springframework.web.bind.annotation.*;
import com.evely.financas.dto.TransactionItemDTO;
import com.evely.financas.dto.TransactionResponseDTO;
import com.evely.financas.enums.TransactionType;
import com.evely.financas.model.Transaction;
import com.evely.financas.model.User;
import com.evely.financas.service.TransactionService;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    /**
     * ✅ ITEM 7: Listagem com filtros opcionais.
     *
     * GET /api/transactions?month=4&year=2026
     * GET /api/transactions?month=4&year=2026&type=EXPENSE
     * GET /api/transactions?month=4&year=2026&categoryId=uuid
     */
    @GetMapping
    public ResponseEntity<List<TransactionItemDTO>> listar(
            @RequestParam int month,
            @RequestParam int year,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) UUID categoryId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
            transactionService.listarComFiltros(user.getId(), month, year, type, categoryId)
        );
    }

    /**
     * ✅ ITEM 8: Agora retorna o objeto criado (TransactionResponseDTO)
     * em vez de uma String — o frontend pode atualizar a UI sem refazer GET.
     */
    @PostMapping
    public ResponseEntity<TransactionResponseDTO> registrarTransacao(
            @RequestBody Transaction transaction,
            @RequestParam(defaultValue = "1") int parcelas,
            @AuthenticationPrincipal User user) {

        Transaction salva = transactionService.registrarTransacao(transaction, parcelas, user.getId());
        return ResponseEntity.status(201).body(toResponseDTO(salva, parcelas));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        transactionService.excluir(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/efetivar/{simulationId}")
    public ResponseEntity<String> efetivarSimulacao(
            @PathVariable UUID simulationId,
            @AuthenticationPrincipal User user) {
        transactionService.efetivarSimulacao(simulationId, user.getId());
        return ResponseEntity.ok(
            "Perfeito! Deixou de ser uma simulação e passou a ser " +
            "uma transação real! Seu dashboard atualizou!");
    }

    // -------------------------------------------------------------------------
    // HELPER
    // -------------------------------------------------------------------------

    private TransactionResponseDTO toResponseDTO(Transaction t, int installmentCount) {
        return new TransactionResponseDTO(
            t.getId(),
            t.getDescription(),
            t.getTotalAmount(),
            t.getPurchaseDate(),
            t.getAccount() != null ? t.getAccount().getId() : null,
            t.getAccount() != null ? t.getAccount().getName() : null,
            t.getCategory() != null ? t.getCategory().getId() : null,
            t.getCategory() != null ? t.getCategory().getName() : null,
            t.getType(),
            t.isSimulation(),
            installmentCount
        );
    }

    @GetMapping("/simulations")
    public ResponseEntity<List<TransactionItemDTO>> listarSimulacoes(
            @RequestParam int month,
            @RequestParam int year,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
            transactionService.listarSimulacoes(user.getId(), month, year)
        );
    }
}
