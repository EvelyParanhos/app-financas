package com.evely.financas.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "audit_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /**
     * Ação realizada.
     * Valores esperados: INSTALLMENT_PAID, INSTALLMENT_REVERSED, TRANSFER,
     *                    LOAN_CREATED, INVOICE_PAID
     */
    @Column(name = "action", nullable = false, length = 50)
    private String action;

    /**
     * Tipo da entidade afetada: "Installment", "Account", "Loan", "CreditCardInvoice"
     */
    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    /**
     * ID da entidade afetada (UUID em VARCHAR para consistência com o restante do projeto).
     */
    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    /**
     * Descrição legível para o histórico (ex: "Parcela #2 de 'Netflix' paga — R$35,90").
     */
    @Column(name = "description", nullable = false, length = 512)
    private String description;

    /**
     * Valor financeiro da operação (pode ser null para operações sem valor específico).
     */
    @Column(name = "amount", precision = 15, scale = 2)
    private BigDecimal amount;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;
}
