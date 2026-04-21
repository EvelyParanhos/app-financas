package com.evely.financas.service;

import java.math.BigDecimal;
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
import com.evely.financas.repository.TransactionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecurringTransactionService {

    private final RecurringTransactionRepository recurringRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionService transactionService;
    private final CreditCardInvoiceService invoiceService;

    /**
     * Scheduler: roda às 01h e materializa as transações recorrentes do dia.
     *
     * ⚠️ NOTA SOBRE VISIBILIDADE FUTURA:
     * O scheduler NÃO é a forma de ver os próximos meses!
     * Os itens futuros aparecem como "virtuais" no checklist via DashboardService.buildRecurrentesVirtuais().
     * O scheduler apenas confirma a materialização quando o dia chega.
     * O usuário pode materializar manualmente via /materialize para qualquer mês.
     */
    @Scheduled(cron = "0 0 1 * * ?")
    @Transactional
    public void processarTransacoesRecorrentes() {
        int diaDeHoje = LocalDate.now().getDayOfMonth();
        List<RecurringTransaction> moldes = recurringRepository.findByDayOfMonth(diaDeHoje);

        for (RecurringTransaction molde : moldes) {
            try {
                // Não materializa se já foi materializado hoje
                String descEsperada = "[RECORRENTE] " + molde.getDescription();
                boolean jaMaterializada = transactionRepository
                    .existsByDescriptionAndAccountIdAndPurchaseDateBetween(
                        descEsperada,
                        molde.getAccount().getId(),
                        LocalDate.now(),
                        LocalDate.now()
                    );

                if (!jaMaterializada) {
                    materializarMolde(molde, LocalDate.now(), null);
                }
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
     *
     * Por que é necessário além do scheduler?
     * O scheduler só roda no dia do mês configurado. Para navegar nos meses
     * futuros no checklist, os itens aparecem como "virtuais" (sem ID).
     * Quando o usuário confirma um item virtual, este endpoint é chamado.
     *
     * @param actualAmount Valor real (opcional). Usado quando isVariable=true —
     *                     permite que o usuário informe o valor correto antes de confirmar.
     *                     Se null e isVariable=false, usa estimatedAmount.
     */
    @Transactional
    public void materializarParaMes(UUID recurringId, int month, int year, UUID userId,
                                    BigDecimal actualAmount) {
        RecurringTransaction molde = recurringRepository.findById(recurringId)
            .orElseThrow(() -> new ObjectNotFoundException("Transação recorrente não encontrada"));

        if (!molde.getAccount().getOwner().getId().equals(userId)) {
            throw new RuntimeException("Sem permissão para materializar esta transação.");
        }

        // Verifica se já foi materializada neste mês
        String descEsperada = "[RECORRENTE] " + molde.getDescription();
        LocalDate inicioMes = LocalDate.of(year, month, 1);
        LocalDate fimMes = inicioMes.withDayOfMonth(inicioMes.lengthOfMonth());

        boolean jaMaterializada = transactionRepository
            .existsByDescriptionAndAccountIdAndPurchaseDateBetween(
                descEsperada, molde.getAccount().getId(), inicioMes, fimMes);

        if (jaMaterializada) {
            throw new RuntimeException(
                "Esta transação recorrente já foi materializada para " + month + "/" + year + ".");
        }

        // Valida actualAmount para transações variáveis
        if (molde.isVariable() && actualAmount != null && actualAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("O valor informado deve ser maior que zero.");
        }

        int diaDoMes = Math.min(molde.getDayOfMonth(), YearMonth.of(year, month).lengthOfMonth());
        LocalDate dataCompetencia = LocalDate.of(year, month, diaDoMes);

        materializarMolde(molde, dataCompetencia, actualAmount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Privado
    // ─────────────────────────────────────────────────────────────────────────

    private void materializarMolde(RecurringTransaction molde, LocalDate data, BigDecimal actualAmount) {
        // Decide qual valor usar:
        // - transação variável COM valor real informado → usa o real
        // - transação variável SEM valor informado → usa estimativa (ajustável depois)
        // - transação fixa → sempre usa estimatedAmount
        BigDecimal valor;
        if (molde.isVariable() && actualAmount != null) {
            valor = actualAmount;
        } else {
            valor = molde.getEstimatedAmount() != null ? molde.getEstimatedAmount() : BigDecimal.ZERO;
        }

        Transaction novaTransacao = new Transaction();
        novaTransacao.setDescription("[RECORRENTE] " + molde.getDescription());
        novaTransacao.setTotalAmount(valor);
        novaTransacao.setType(molde.getType());
        novaTransacao.setAccount(molde.getAccount());
        novaTransacao.setCategory(molde.getCategory());
        novaTransacao.setPurchaseDate(data);
        novaTransacao.setSimulation(false);

        // 1 parcela → fica PENDING no checklist (RN17: validação do usuário)
        transactionService.registrarTransacao(
            novaTransacao, 1, molde.getAccount().getOwner().getId()
        );
    }
}