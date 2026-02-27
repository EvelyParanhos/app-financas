package com.evely.financas.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.model.Transaction;
import com.evely.financas.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
            @RequestParam String telegramId) { 
        
        transactionService.registrarTransacao(transaction, parcelas, telegramId);
        
        return ResponseEntity.status(201).body("Transação registrada com " + parcelas + " parcela(s) no usuário com id: " + telegramId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir (@PathVariable Integer id) {
        transactionService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
