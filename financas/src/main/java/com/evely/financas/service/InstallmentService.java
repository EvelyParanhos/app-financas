package com.evely.financas.service;

import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.model.Installment;
import com.evely.financas.model.User;
import com.evely.financas.repository.InstallmentRepository;
import com.evely.financas.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InstallmentService {

    private final InstallmentRepository installmentRepository;
    private final UserRepository userRepository;

    public Installment pagarParcela(UUID id) {
        Installment parcela = installmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Parcela não encontrada!"));
        parcela.setStatus(InstallmentStatus.PAID);
        return installmentRepository.save(parcela);
    }

    @Transactional
    public void dividirParcela (UUID installmentId, BigDecimal valorPayer1, UUID idPayer2) {
        Installment original = installmentRepository.findById(installmentId)
            .orElseThrow(() -> new RuntimeException("Parcela não encontrada!"));
        
        BigDecimal valorTotalOriginal = original.getAmount();

        User payer2 = userRepository.findById(idPayer2)
            .orElseThrow(()-> new RuntimeException("Segundo pagador não encontrado!"));

        if (valorPayer1.compareTo(valorTotalOriginal) >= 0) {
            throw new RuntimeException("O valor da divisão deve ser menor que o valor total da parcela!");
        }

        BigDecimal valorPayer2 = valorTotalOriginal.subtract(valorPayer1);

        original.setAmount(valorPayer1);

        Installment irma = new Installment();
        irma.setTransaction(original.getTransaction()); 
        irma.setInstallmentNumber(original.getInstallmentNumber()); 
        irma.setDueDate(original.getDueDate()); 
        irma.setStatus(original.getStatus()); 
        irma.setAmount(valorPayer2); 
        irma.setPayer(payer2); 
        installmentRepository.save(original);
        installmentRepository.save(irma);
    }

    public void assumirParcelaTotal(UUID installmentId, UUID novoPayerId) {
        Installment parcela = installmentRepository.findById(installmentId)
                .orElseThrow(() -> new RuntimeException("Parcela não encontrada!"));
        User novoPagador = userRepository.findById(novoPayerId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado!"));
        parcela.setPayer(novoPagador);
        installmentRepository.save(parcela);
    }
}
