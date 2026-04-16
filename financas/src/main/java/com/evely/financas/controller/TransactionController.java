package com.evely.financas.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.model.Transaction;
import com.evely.financas.model.User;
import com.evely.financas.service.TransactionService;
import lombok.RequiredArgsConstructor;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    public ResponseEntity<String> registrarTransacao(
            @RequestBody Transaction transaction, 
            @RequestParam(defaultValue = "1") int parcelas,
            @AuthenticationPrincipal User user) { 
        
        transactionService.registrarTransacao(transaction, parcelas, user.getId());
        
        return ResponseEntity.status(201).body("Transação registrada com " + parcelas + " parcelas");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir (@PathVariable UUID id) {
        transactionService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/efetivar/{simulationId}")
    public ResponseEntity<String> efetivarSimulacao (@PathVariable UUID simulationId) {
        transactionService.efetivarSimulacao(simulationId);

        return ResponseEntity.status(200).body("Perfeito! Deixou de ser uma simulação e passou a ser uma transação real! Seu dashboard atualizou!");
    }
}
