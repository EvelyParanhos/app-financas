package com.evely.financas.controller;

import com.evely.financas.model.Installment;
import com.evely.financas.service.InstallmentService;
import lombok.RequiredArgsConstructor;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/installments")
@RequiredArgsConstructor
public class InstallmentController {

    private final InstallmentService installmentService;

    @PatchMapping("/{id}/pay")
    public ResponseEntity<Installment> marcarComoPaga(@PathVariable UUID id) {
        Installment paga = installmentService.pagarParcela(id);
        return ResponseEntity.ok(paga);
    }

    @PostMapping("/{id}/split")
    public ResponseEntity <String> dividirParcela(@PathVariable UUID id, @RequestParam BigDecimal valorPayer1, @RequestParam UUID idPayer2) {
        installmentService.dividirParcela(id, valorPayer1, idPayer2);
        return ResponseEntity.ok("Parcela dividiva com sucesso!");
    }

    @PostMapping("/{id}/assumir")
    public ResponseEntity<String> assumirParcela(@PathVariable UUID id, @RequestParam UUID novoPayerId) {
        installmentService.assumirParcelaTotal(id, novoPayerId);
        return ResponseEntity.ok("Parcela assumida para outro pagador com sucesso!");
    }
    
} 
