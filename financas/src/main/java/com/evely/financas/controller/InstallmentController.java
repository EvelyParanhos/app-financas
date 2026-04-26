package com.evely.financas.controller;

import com.evely.financas.model.Installment;
import com.evely.financas.model.User;
import com.evely.financas.service.InstallmentService;
import lombok.RequiredArgsConstructor;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/installments")
@RequiredArgsConstructor
public class InstallmentController {

    private final InstallmentService installmentService;

    @PatchMapping("/{id}/pay")
    public ResponseEntity<Installment> marcarComoPaga(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        Installment paga = installmentService.pagarParcela(id, user.getId());
        return ResponseEntity.ok(paga);
    }

    /**
     * RN06 + RN07 — Divide uma parcela entre dois pagadores.
     * Exige que ambos façam parte de uma partnership ativa.
     */
    @PostMapping("/{id}/split")
    public ResponseEntity<String> dividirParcela(
            @PathVariable UUID id,
            @RequestParam BigDecimal valorPayer1,
            @RequestParam UUID idPayer2,
            @AuthenticationPrincipal User user) {
        installmentService.dividirParcela(id, valorPayer1, idPayer2, user.getId());
        return ResponseEntity.ok("Parcela dividida com sucesso!");
    }

    /**
     * RN05 + RN07 — Um parceiro assume 100% de uma parcela do outro.
     * Exige partnership ativa entre os dois usuários.
     */
    @PostMapping("/{id}/assumir")
    public ResponseEntity<String> assumirParcela(
            @PathVariable UUID id,
            @RequestParam UUID novoPayerId,
            @AuthenticationPrincipal User user) {
        installmentService.assumirParcelaTotal(id, novoPayerId, user.getId());
        return ResponseEntity.ok("Parcela assumida com sucesso!");
    }
}
