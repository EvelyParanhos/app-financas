package com.evely.financas.service;

import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.evely.financas.model.AuditLog;
import com.evely.financas.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Serviço de auditoria — registra operações financeiras críticas.
 *
 * Intencionalmente simples e sem @Transactional próprio:
 * é chamado dentro de transações existentes (InstallmentService,
 * EstornoService, etc.), participando da mesma transação do caller.
 * Se a operação principal falhar e sofrer rollback, o log também é revertido.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Registra uma operação financeira no histórico de auditoria.
     *
     * @param userId      ID do usuário que realizou a ação
     * @param action      Código da ação (ex: "INSTALLMENT_PAID")
     * @param entityType  Tipo da entidade afetada (ex: "Installment")
     * @param entityId    ID da entidade afetada
     * @param description Descrição legível (ex: "Parcela #2 de 'Netflix' paga — R$35,90")
     * @param amount      Valor financeiro da operação (pode ser null)
     */
    public void log(UUID userId, String action, String entityType,
                    UUID entityId, String description, BigDecimal amount) {
        try {
            AuditLog entry = new AuditLog();
            entry.setUserId(userId);
            entry.setAction(action);
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            entry.setDescription(description);
            entry.setAmount(amount);
            auditLogRepository.save(entry);
        } catch (Exception e) {
            // Auditoria nunca deve derrubar a operação principal
            log.error("Falha ao registrar auditoria [action={}, entityId={}]: {}",
                action, entityId, e.getMessage());
        }
    }
}