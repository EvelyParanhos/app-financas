package com.evely.financas.controller;

import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.service.PartnershipService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/partnerships")
@RequiredArgsConstructor
public class PartnershipController {

    private final PartnershipService partnershipService;

    @PostMapping("/invite/{userId}")
    public ResponseEntity<String> gerarConvite(@PathVariable UUID userId) {
        String codigo = partnershipService.gerarCodigoConvite(userId);
        return ResponseEntity.ok(codigo);
    }

    @PostMapping("/accept")
    public ResponseEntity<String> aceitarConvite(@RequestParam String code, @RequestParam UUID userId) {
        partnershipService.aceitarConvite(code, userId);
        return ResponseEntity.ok("Conexão estabelecida com sucesso! O núcleo familiar foi criado.");
    }
}
