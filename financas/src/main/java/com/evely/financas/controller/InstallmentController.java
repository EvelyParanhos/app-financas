package com.evely.financas.controller;

import com.evely.financas.model.Installment;
import com.evely.financas.service.InstallmentService;
import lombok.RequiredArgsConstructor;
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
} 
