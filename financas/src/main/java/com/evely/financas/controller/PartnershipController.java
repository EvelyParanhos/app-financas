package com.evely.financas.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.evely.financas.model.User;
import com.evely.financas.service.PartnershipService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/partnerships")
@RequiredArgsConstructor
public class PartnershipController {

    private final PartnershipService partnershipService;

    @PostMapping("/invite")
    public ResponseEntity<String> gerarConvite(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(partnershipService.gerarCodigoConvite(user.getId()));
    }

    @PostMapping("/accept")
    public ResponseEntity<String> aceitarConvite(
            @RequestParam String code,
            @AuthenticationPrincipal User user) {
        partnershipService.aceitarConvite(code, user.getId());
        return ResponseEntity.ok("Conexão estabelecida com sucesso!");
    }

    /**
     * ✅ ITEM 9: Dissolve a parceria ativa do usuário autenticado.
     *
     * DELETE /api/partnerships/me
     *
     * Ambos os usuários perdem acesso às funcionalidades de casal
     * (dashboard casal, divisão de parcelas, etc.) após esta operação.
     * O histórico financeiro é preservado.
     */
    @DeleteMapping("/me")
    public ResponseEntity<Void> dissolver(@AuthenticationPrincipal User user) {
        partnershipService.dissolverParceria(user.getId());
        return ResponseEntity.noContent().build();
    }
}