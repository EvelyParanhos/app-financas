package com.evely.financas.controller;

import com.evely.financas.model.Installment;
import com.evely.financas.service.InstallmentService;
import lombok.RequiredArgsConstructor;
import java.math.BigDecimal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/installments")
@RequiredArgsConstructor
public class InstallmentController {

    private final InstallmentService installmentService;

    @PatchMapping("/{id}/pay")
    public ResponseEntity<Installment> marcarComoPaga(@PathVariable Integer id) {
        Installment paga = installmentService.pagarParcela(id);
        return ResponseEntity.ok(paga);
    }

    @PostMapping("/{id}/split")
    public ResponseEntity <String> dividirParcela(@PathVariable Integer id, @RequestParam BigDecimal valorPayer1, @RequestParam Integer idPayer2) {
        installmentService.dividirParcela(id, valorPayer1, idPayer2);
        return ResponseEntity.ok("Parcela dividiva com sucesso!");
    }

    @PostMapping("/{id}/assumir")
    public ResponseEntity<String> assumirParcela(@PathVariable Integer id, @RequestParam Integer novoPayerId) {
        installmentService.assumirParcelaTotal(id, novoPayerId);
        return ResponseEntity.ok("Parcela assumida para outro pagador com sucesso!");
    }
    
} 
