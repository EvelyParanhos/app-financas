package com.evely.financas.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Transaction;
import jakarta.transaction.Transactional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    /**
     * Busca os 5 lançamentos reais mais recentes do usuário.
     * Simulações são excluídas — aparecem apenas no checklist "Bola de Cristal".
     * RN14: simulações são invisíveis para o fluxo real.
     */
    List<Transaction> findTop5ByAccountOwnerIdAndIsSimulationFalseOrderByPurchaseDateDesc(
        UUID ownerId
    );

    /**
     * Usado pelo cleanup scheduler para excluir simulações antigas.
     * Retorna as entidades completas para que o JPA faça o cascade
     * correto das Installments filhas (evita dados órfãos — RN13).
     */
    List<Transaction> findByIsSimulationTrueAndCreatedAtBefore(LocalDateTime limite);

    /**
     * @deprecated Substituído por deleteAll(list) para garantir cascade.
     * Mantido para compatibilidade mas não deve ser mais chamado.
     */
    @Deprecated
    @Transactional
    Long deleteByIsSimulationTrueAndCreatedAtBefore(LocalDateTime dia);
}