package com.evely.financas.controller;

import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.evely.financas.model.Installment;
import com.evely.financas.model.User;
import com.evely.financas.service.EstornoService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/installments")
@RequiredArgsConstructor
public class EstornoController {

    private final EstornoService estornoService;

    /**
     * Estorna uma parcela paga — desfaz o efeito financeiro sem apagar o histórico.
     * A parcela volta para PENDING e pode ser paga novamente.
     *
     * PATCH /api/installments/{id}/estornar
     */
    @PatchMapping("/{id}/estornar")
    public ResponseEntity<Installment> estornar(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(estornoService.estornarParcela(id, user.getId()));
    }
}