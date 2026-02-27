package com.evely.financas.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.evely.financas.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionCleanupService {
    private final TransactionRepository TransactionRepository;

    public void limparSimulacoesAntigas () {
        LocalDateTime limite = LocalDateTime.now().minusDays(3);

        long deletados = TransactionRepository.deleteByIsSimulationTrueAndCreatedAtBefore(limite);

        log.info("Faxina concluída: {} simulações antigas foram removidas.", deletados);
    }

}
