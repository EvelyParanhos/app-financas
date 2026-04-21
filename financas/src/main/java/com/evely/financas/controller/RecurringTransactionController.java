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
import com.evely.financas.service.RecurringTransactionService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/recurring")
@RequiredArgsConstructor
public class RecurringTransactionController {

    private final RecurringTransactionRepository recurringRepository;
    private final AccountRepository accountRepository;
    private final RecurringTransactionService recurringTransactionService;

    @PostMapping
    public ResponseEntity<RecurringTransaction> criar(
            @RequestBody RecurringTransaction rt,
            @AuthenticationPrincipal User user) {
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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        recurringTransactionService.excluir(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecurringTransaction> editar(
            @PathVariable UUID id,
            @RequestBody RecurringTransaction rt,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(recurringTransactionService.editar(id, rt, user.getId()));
    }

    /**
     * Materializa um item recorrente virtual para o mês/ano indicado.
     *
     * POST /api/recurring/{id}/materialize?month=4&year=2026
     * POST /api/recurring/{id}/materialize?month=4&year=2026&actualAmount=187.50
     *
     * O parâmetro actualAmount é OPCIONAL:
     *  - Para transações FIXAS (isVariable=false): ignorado, usa estimatedAmount.
     *  - Para transações VARIÁVEIS (isVariable=true): obrigatório para registrar
     *    o valor real (ex: conta de luz que veio R$187,50 em vez de R$150 estimados).
     *    Se omitido em transação variável, registra com o valor estimado como rascunho.
     */
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