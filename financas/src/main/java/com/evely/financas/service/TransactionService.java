package com.evely.financas.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.stereotype.Service;
import com.evely.financas.repository.TransactionRepository;
import com.evely.financas.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.model.Installment;
import com.evely.financas.model.Transaction;
import com.evely.financas.model.User;
import com.evely.financas.repository.InstallmentRepository; 

@Service
@RequiredArgsConstructor
public class TransactionService {
    private final TransactionRepository transactionRepository;
    private final InstallmentRepository installmentRepository;
    private final UserRepository userRepository;

    public void registrarTransacao (Transaction transacao, int totalParcelas, String telegramId) {
        User pagador = userRepository.findByTelegramId(telegramId)
            .orElseThrow(() -> new RuntimeException("Usuário do Telegram não cadastrado!"));
            
        Transaction transacaoSalva = transactionRepository.save(transacao);

        BigDecimal valorParcela = transacao.getTotalAmount().divide(BigDecimal.valueOf(totalParcelas), 2, RoundingMode.HALF_UP);

        for (int i=1; i <= totalParcelas; i++) {
            Installment parcela = new Installment();
            parcela.setInstallmentNumber(i);
            parcela.setStatus(InstallmentStatus.PENDING);
            parcela.setTransaction(transacaoSalva);
            parcela.setAmount(valorParcela);
            parcela.setDueDate(transacaoSalva.getPurchaseDate().plusMonths(i));
            parcela.setPayer(pagador);

            installmentRepository.save(parcela);
        }
    }
}
