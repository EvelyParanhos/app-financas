package com.evely.financas.service;

import java.time.LocalDateTime;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j

public class TransactionCleanupService {
    private final TransactionRepository TransactionRepository;

    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void limparSimulacoesAntigas () {
        LocalDateTime limite = LocalDateTime.now().minusDays(3);

        long deletados = TransactionRepository.deleteByIsSimulationTrueAndCreatedAtBefore(limite);

        log.info("Faxina concluída: {} simulações antigas foram removidas.", deletados);
    }

}
