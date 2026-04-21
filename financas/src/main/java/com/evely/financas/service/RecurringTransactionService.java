package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import com.evely.financas.dto.InvestmentEntryDTO;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.InvestmentEntryType;
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
    private final InvestmentService investmentService;

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void excluir(UUID id, UUID userId) {
        RecurringTransaction rt = recurringRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Transação recorrente não encontrada"));
        if (!rt.getAccount().getOwner().getId().equals(userId)) {
            throw new RuntimeException("Sem permissão para excluir esta transação recorrente.");
        }
        recurringRepository.delete(rt);
    }

    @Transactional
    public RecurringTransaction editar(UUID id, RecurringTransaction dados, UUID userId) {
        RecurringTransaction rt = recurringRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Transação recorrente não encontrada"));
        if (!rt.getAccount().getOwner().getId().equals(userId)) {
            throw new RuntimeException("Sem permissão para editar esta transação recorrente.");
        }
        rt.setDescription(dados.getDescription());
        rt.setEstimatedAmount(dados.getEstimatedAmount());
        rt.setDayOfMonth(dados.getDayOfMonth());
        rt.setType(dados.getType());
        rt.setVariable(dados.isVariable());
        if (dados.getCategory() != null) rt.setCategory(dados.getCategory());
        return recurringRepository.save(rt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SCHEDULER
    // ─────────────────────────────────────────────────────────────────────────

    @Scheduled(cron = "0 0 1 * * ?")
    @Transactional
    public void processarTransacoesRecorrentes() {
        int diaDeHoje = LocalDate.now().getDayOfMonth();
        List<RecurringTransaction> moldes = recurringRepository.findByDayOfMonth(diaDeHoje);

        for (RecurringTransaction molde : moldes) {
            try {
                // Contas de INVESTIMENTO não são materializadas pelo scheduler —
                // devem ser confirmadas manualmente pelo usuário via /materialize
                if (molde.getAccount().getType() == AccountType.INVESTMENT) continue;

                if (!jaMaterializadaNoPeriodo(molde, LocalDate.now(), LocalDate.now())) {
                    materializarMolde(molde, LocalDate.now(), null);
                }
            } catch (Exception e) {
                log.error("Erro ao processar recorrente '{}': {}", molde.getDescription(), e.getMessage());
            }
        }
        log.info("Recorrentes processados: {} itens do dia.", moldes.size());
    }

    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void fecharFaturasDoMes() {
        invoiceService.fecharFaturasVencidas();
        log.info("Verificação de fechamento de faturas concluída.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MATERIALIZAÇÃO MANUAL
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Materializa manualmente para um mês/ano específico.
     *
     * Para contas de INVESTIMENTO: cria um InvestmentEntry DEPOSIT diretamente,
     * sem criar Transaction (investimentos não passam pelo checklist de parcelas).
     *
     * Para demais contas: cria Transaction + Installment PENDING no checklist.
     *
     * @param actualAmount Valor real (opcional).
     *   - Para transações VARIÁVEIS: informe o valor exato antes de confirmar.
     *   - Para transações FIXAS: ignorado, usa estimatedAmount.
     *   - Se omitido em variável: registra com o valor estimado.
     */
    @Transactional
    public void materializarParaMes(UUID recurringId, int month, int year,
                                    UUID userId, BigDecimal actualAmount) {
        RecurringTransaction molde = recurringRepository.findById(recurringId)
            .orElseThrow(() -> new ObjectNotFoundException("Transação recorrente não encontrada"));

        if (!molde.getAccount().getOwner().getId().equals(userId)) {
            throw new RuntimeException("Sem permissão para materializar esta transação.");
        }

        LocalDate inicioMes = LocalDate.of(year, month, 1);
        LocalDate fimMes = inicioMes.withDayOfMonth(inicioMes.lengthOfMonth());

        // Para contas de investimento, verifica via InvestmentEntry notes
        // Para as demais, verifica via Transaction description
        if (molde.getAccount().getType() != AccountType.INVESTMENT
                && jaMaterializadaNoPeriodo(molde, inicioMes, fimMes)) {
            throw new RuntimeException(
                "Esta transação já foi registrada para " + month + "/" + year + ".");
        }

        if (molde.isVariable() && actualAmount != null && actualAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("O valor informado deve ser maior que zero.");
        }

        int diaDoMes = Math.min(molde.getDayOfMonth(), YearMonth.of(year, month).lengthOfMonth());
        materializarMolde(molde, LocalDate.of(year, month, diaDoMes), actualAmount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVADO
    // ─────────────────────────────────────────────────────────────────────────

    private void materializarMolde(RecurringTransaction molde, LocalDate data, BigDecimal actualAmount) {
        BigDecimal valor = resolverValor(molde, actualAmount);

        // ✅ Conta de INVESTIMENTO → cria InvestmentEntry DEPOSIT diretamente.
        // Não passa pelo checklist (sem Transaction + Installment).
        // Isso é correto: o aporte na reserva é imediato ao ser confirmado.
        // O histórico fica rastreado em InvestmentEntry, assim como os aportes manuais.
        if (molde.getAccount().getType() == AccountType.INVESTMENT) {
            InvestmentEntryDTO dto = new InvestmentEntryDTO(
                molde.getAccount().getId(),
                InvestmentEntryType.DEPOSIT,
                valor,
                data,
                "[RECORRENTE] " + molde.getDescription()
            );
            investmentService.lancarEntrada(dto, molde.getAccount().getOwner().getId());
            return;
        }

        // Para demais contas: Transaction + Installment PENDING no checklist
        Transaction novaTransacao = new Transaction();
        novaTransacao.setDescription("[RECORRENTE] " + molde.getDescription());
        novaTransacao.setTotalAmount(valor);
        novaTransacao.setType(molde.getType());
        novaTransacao.setAccount(molde.getAccount());
        novaTransacao.setCategory(molde.getCategory());
        novaTransacao.setPurchaseDate(data);
        novaTransacao.setSimulation(false);

        transactionService.registrarTransacao(novaTransacao, 1,
            molde.getAccount().getOwner().getId());
    }

    private BigDecimal resolverValor(RecurringTransaction molde, BigDecimal actualAmount) {
        if (molde.isVariable() && actualAmount != null) return actualAmount;
        return molde.getEstimatedAmount() != null ? molde.getEstimatedAmount() : BigDecimal.ZERO;
    }

    private boolean jaMaterializadaNoPeriodo(RecurringTransaction molde, LocalDate inicio, LocalDate fim) {
        return transactionRepository.existsByDescriptionAndAccountIdAndPurchaseDateBetween(
            "[RECORRENTE] " + molde.getDescription(), molde.getAccount().getId(), inicio, fim);
    }
}