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
import com.evely.financas.enums.TransactionType;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.Installment;
import com.evely.financas.model.RecurringTransaction;
import com.evely.financas.model.Transaction;
import com.evely.financas.model.User;
import com.evely.financas.repository.AccountRepository;
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
    private final InstallmentService installmentService;
    private final AccountRepository accountRepository;
    private final AccountService accountService;

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public RecurringTransaction criar(RecurringTransaction rt, User user) {
        validarDadosBasicos(rt);
        rt.setUser(user);

        if (rt.getAccount() == null || rt.getAccount().getId() == null) {
            Account carteira = accountRepository
                .findByOwnerId(user.getId())
                .stream()
                .filter(a -> a.getType() == AccountType.CASH)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Carteira nao encontrada"));
            rt.setAccount(carteira);
        } else {
            Account conta = accountService
                .buscarContaComAcessoPermitido(rt.getAccount().getId(), user.getId());
            validarContaParaRecorrencia(rt.getType(), conta);
            rt.setAccount(conta);
        }

        return recurringRepository.save(rt);
    }

    public List<RecurringTransaction> listar(UUID userId) {
        return recurringRepository.findByUserId(userId);
    }

    @Transactional
    public void excluir(UUID id, UUID userId) {
        RecurringTransaction rt = recurringRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Transação recorrente não encontrada"));
        validarDono(rt, userId);
        recurringRepository.delete(rt);
    }

    @Transactional
    public RecurringTransaction editar(UUID id, RecurringTransaction dados, UUID userId) {
        RecurringTransaction rt = recurringRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Transação recorrente não encontrada"));
        validarDono(rt, userId);
        validarDadosBasicos(dados);
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

        log.info("Recorrentes aguardando validacao manual hoje: {} itens.", moldes.size());
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
    public Transaction materializarParaMes(UUID recurringId, int month, int year,
                                           UUID userId, BigDecimal actualAmount) {
        RecurringTransaction molde = recurringRepository.findById(recurringId)
            .orElseThrow(() -> new ObjectNotFoundException("Transação recorrente não encontrada"));

        validarDono(molde, userId);

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
        return materializarMolde(molde, LocalDate.of(year, month, diaDoMes), actualAmount);
    }

    @Transactional
    public Installment confirmarParaMes(UUID recurringId, int month, int year,
                                        UUID userId, BigDecimal actualAmount) {
        Transaction transacao = materializarParaMes(recurringId, month, year, userId, actualAmount);
        if (transacao == null || transacao.getInstallments().isEmpty()) {
            return null;
        }

        Installment parcela = transacao.getInstallments().get(0);
        return installmentService.pagarParcela(parcela.getId(), userId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVADO
    // ─────────────────────────────────────────────────────────────────────────

    private Transaction materializarMolde(RecurringTransaction molde, LocalDate data, BigDecimal actualAmount) {
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
            investmentService.lancarEntrada(dto,
                molde.getUser() != null ? molde.getUser().getId() : molde.getAccount().getOwner().getId());
            return null;
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

        return transactionService.registrarTransacao(novaTransacao, 1,
            molde.getUser() != null ? molde.getUser().getId() : molde.getAccount().getOwner().getId());
    }

    private void validarDono(RecurringTransaction rt, UUID userId) {
        if (rt.getUser() != null && rt.getUser().getId().equals(userId)) {
            return;
        }
        if (rt.getUser() == null && rt.getAccount().getOwner().getId().equals(userId)) {
            return;
        }
        throw new RuntimeException("Sem permissao para gerenciar esta transacao recorrente.");
    }

    private void validarDadosBasicos(RecurringTransaction rt) {
        if (rt.getDescription() == null || rt.getDescription().isBlank()) {
            throw new RuntimeException("Informe uma descricao.");
        }
        if (rt.getEstimatedAmount() == null || rt.getEstimatedAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Informe um valor estimado maior que zero.");
        }
        if (rt.getDayOfMonth() < 1 || rt.getDayOfMonth() > 31) {
            throw new RuntimeException("O dia do mes deve ficar entre 1 e 31.");
        }
        if (rt.getType() != TransactionType.EXPENSE && rt.getType() != TransactionType.INCOME) {
            throw new RuntimeException("Recorrencias aceitam apenas entradas ou gastos.");
        }
    }

    private void validarContaParaRecorrencia(TransactionType tipo, Account conta) {
        if (tipo == TransactionType.INCOME
                && conta.getType() != AccountType.CASH
                && conta.getType() != AccountType.CHECKING) {
            throw new RuntimeException("Entradas recorrentes devem cair em carteira ou conta corrente.");
        }
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
