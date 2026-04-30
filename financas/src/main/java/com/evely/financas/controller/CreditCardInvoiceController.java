package com.evely.financas.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.evely.financas.model.CreditCardInvoice;
import com.evely.financas.model.User;
import com.evely.financas.service.CreditCardInvoiceService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class CreditCardInvoiceController {

    private final CreditCardInvoiceService invoiceService;

    @GetMapping("/account/{accountId}")
    public ResponseEntity<List<CreditCardInvoice>> listarFaturas(
            @PathVariable UUID accountId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(invoiceService.listarFaturasDoCartao(accountId, user.getId()));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<CreditCardInvoice>> faturasPendentes(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(invoiceService.listarFaturasPendentesDoUsuario(user.getId()));
    }

    /**
     * ✅ ITEM 6: sourceAccountId agora é obrigatório.
     * Indica de qual conta corrente/carteira sai o dinheiro para pagar a fatura.
     */
    @PostMapping("/{invoiceId}/pay")
    public ResponseEntity<CreditCardInvoice> pagar(
            @PathVariable UUID invoiceId,
            @RequestParam BigDecimal valor,
            @RequestParam UUID sourceAccountId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
            invoiceService.pagarFatura(invoiceId, valor, sourceAccountId, user.getId())
        );
    }
}
