package com.evely.financas.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
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
        String codigo = partnershipService.gerarCodigoConvite(user.getId());
        return ResponseEntity.ok(codigo);
    }

@PostMapping("/accept")
    public ResponseEntity<String> aceitarConvite(@RequestParam String code, @AuthenticationPrincipal User user) {
        partnershipService.aceitarConvite(code, user.getId());
        return ResponseEntity.ok("Conexão estabelecida com sucesso!");
    }
}
