package com.evely.financas.service;

import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.model.Installment;
import com.evely.financas.repository.InstallmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InstallmentService {

    private final InstallmentRepository installmentRepository;

    public Installment pagarParcela(Integer id) {
        Installment parcela = installmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Parcela não encontrada!"));
        parcela.setStatus(InstallmentStatus.PAID);
        return installmentRepository.save(parcela);
    }
} 
