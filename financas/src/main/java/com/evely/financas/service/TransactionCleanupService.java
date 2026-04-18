package com.evely.financas.service;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.model.Transaction;
import com.evely.financas.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionCleanupService {

    private final TransactionRepository transactionRepository;

    /**
     * Limpa simulações com mais de 3 dias — roda às 3h da madrugada.
     *
     * A estratégia correta é:
     * 1. Buscar as entidades via JPA (retorna objetos gerenciados)
     * 2. Chamar deleteAll() — o JPA dispara o cascade configurado em
     *    Transaction.installments (CascadeType.ALL + orphanRemoval = true),
     *    apagando as Installments filhas antes de apagar a Transaction pai.
     *
     * O motivo de NÃO usar a query JPQL bulk (@Modifying DELETE FROM ...) é
     * que queries bulk bypssam o contexto de persistência do JPA e NÃO
     * disparam o cascade — deixaria Installments órfãs no banco.
     */
    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void limparSimulacoesAntigas() {
        LocalDateTime limite = LocalDateTime.now().minusDays(3);

        List<Transaction> antigas = transactionRepository
            .findByIsSimulationTrueAndCreatedAtBefore(limite);

        if (antigas.isEmpty()) {
            log.info("Faxina: nenhuma simulação antiga encontrada.");
            return;
        }

        // deleteAll carrega as entidades no contexto JPA → cascade funciona
        transactionRepository.deleteAll(antigas);

        log.info("Faxina concluída: {} simulações antigas removidas.", antigas.size());
    }
}