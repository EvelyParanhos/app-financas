package com.evely.financas.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.RecurringTransaction;
import com.evely.financas.model.Transaction;
import com.evely.financas.repository.RecurringTransactionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecurringTransactionService {

    private final RecurringTransactionRepository recurringRepository;
    private final TransactionService transactionService;
    private final CreditCardInvoiceService invoiceService;

    /**
     * Roda todos os dias às 01h e materializa as transações recorrentes
     * cujo dayOfMonth é igual ao dia de hoje.
     * Como TransactionService não faz auto-pay, as parcelas geradas
     * ficam PENDING e aparecem no checklist para o usuário confirmar.
     */
    @Scheduled(cron = "0 0 1 * * ?")
    @Transactional
    public void processarTransacoesRecorrentes() {
        int diaDeHoje = LocalDate.now().getDayOfMonth();

        List<RecurringTransaction> moldes = recurringRepository.findByDayOfMonth(diaDeHoje);

        for (RecurringTransaction molde : moldes) {
            try {
                materializarMolde(molde, LocalDate.now());
            } catch (Exception e) {
                log.error("Erro ao processar transação recorrente '{}': {}",
                    molde.getDescription(), e.getMessage());
            }
        }

        log.info("Transações recorrentes processadas: {} itens.", moldes.size());
    }

    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void fecharFaturasDoMes() {
        invoiceService.fecharFaturasVencidas();
        log.info("Verificação de fechamento de faturas concluída.");
    }

    /**
     * Materializa manualmente uma transação recorrente para um mês/ano específico.
     * Chamado pelo endpoint PATCH /api/recurring/{id}/materialize quando o usuário
     * marca um item virtual do checklist como pago.
     */
    @Transactional
    public void materializarParaMes(UUID recurringId, int month, int year, UUID userId) {
        RecurringTransaction molde = recurringRepository.findById(recurringId)
            .orElseThrow(() -> new ObjectNotFoundException("Transação recorrente não encontrada"));

        if (!molde.getAccount().getOwner().getId().equals(userId)) {
            throw new RuntimeException("Sem permissão para materializar esta transação.");
        }

        int diaDoMes = Math.min(molde.getDayOfMonth(), YearMonth.of(year, month).lengthOfMonth());
        LocalDate dataCompetencia = LocalDate.of(year, month, diaDoMes);

        materializarMolde(molde, dataCompetencia);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Privado
    // ─────────────────────────────────────────────────────────────────────────

    private void materializarMolde(RecurringTransaction molde, LocalDate data) {
        Transaction novaTransacao = new Transaction();
        novaTransacao.setDescription("[RECORRENTE] " + molde.getDescription());
        novaTransacao.setTotalAmount(molde.getEstimatedAmount());
        novaTransacao.setType(molde.getType());
        novaTransacao.setAccount(molde.getAccount());
        novaTransacao.setCategory(molde.getCategory());
        novaTransacao.setPurchaseDate(data);
        novaTransacao.setSimulation(false);

        // 1 parcela → fica PENDING no checklist (TransactionService não faz auto-pay)
        transactionService.registrarTransacao(
            novaTransacao, 1, molde.getAccount().getOwner().getId()
        );
    }
}