package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.enums.InvoiceStatus;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.CreditCardInvoice;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.CreditCardInvoiceRepository;
import com.evely.financas.repository.InstallmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CreditCardInvoiceService {

    private final CreditCardInvoiceRepository invoiceRepository;
    private final AccountRepository accountRepository;
    private final BalanceService balanceService;
    private final AuditService auditService;
    private final AccountService accountService;
    private final InstallmentRepository installmentRepository;

    public LocalDate resolverMesDaPrimeiraParcela(Account account, LocalDate purchaseDate) {
        int closingDay = account.getClosingDay();
        if (purchaseDate.getDayOfMonth() > closingDay) {
            return purchaseDate.plusMonths(1).withDayOfMonth(1);
        }
        return purchaseDate.withDayOfMonth(1);
    }

    @Transactional
    public CreditCardInvoice buscarOuCriarFatura(Account account, int mes, int ano) {
        return invoiceRepository
            .findByAccountIdAndReferenceMonthAndReferenceYear(account.getId(), mes, ano)
            .orElseGet(() -> criarNovaFatura(account, mes, ano));
    }

    private CreditCardInvoice criarNovaFatura(Account account, int mes, int ano) {
        int diasNoMes = YearMonth.of(ano, mes).lengthOfMonth();
        int closingDia = Math.min(account.getClosingDay(), diasNoMes);
        LocalDate closingDate = LocalDate.of(ano, mes, closingDia);

        int mesSeguinte = mes + 1 > 12 ? 1 : mes + 1;
        int anoSeguinte = mes + 1 > 12 ? ano + 1 : ano;
        int dueDia = Math.min(account.getDueDay(), YearMonth.of(anoSeguinte, mesSeguinte).lengthOfMonth());
        LocalDate dueDate = LocalDate.of(anoSeguinte, mesSeguinte, dueDia);

        CreditCardInvoice invoice = new CreditCardInvoice();
        invoice.setAccount(account);
        invoice.setReferenceMonth(mes);
        invoice.setReferenceYear(ano);
        invoice.setClosingDate(closingDate);
        invoice.setDueDate(dueDate);
        invoice.setTotalAmount(BigDecimal.ZERO);
        invoice.setStatus(InvoiceStatus.OPEN);
        invoice.setPaidAmount(BigDecimal.ZERO);

        return invoiceRepository.save(invoice);
    }

    @Transactional
    public void adicionarValorNaFatura(CreditCardInvoice invoice, BigDecimal valor) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("O valor da compra no cartao deve ser maior que zero.");
        }

        consumirLimiteDoCartao(invoice.getAccount(), valor);
        invoice.setTotalAmount(safe(invoice.getTotalAmount()).add(valor));
        invoiceRepository.save(invoice);
    }

    @Transactional
    public void removerValorDaFatura(CreditCardInvoice invoice, BigDecimal valor) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("O valor do estorno deve ser maior que zero.");
        }

        BigDecimal totalAtual = safe(invoice.getTotalAmount());
        if (valor.compareTo(totalAtual) > 0) {
            throw new RuntimeException("O valor do estorno ultrapassa o total da fatura.");
        }

        BigDecimal novoTotal = totalAtual.subtract(valor);
        BigDecimal pagoAtual = safe(invoice.getPaidAmount());
        BigDecimal novoPago = pagoAtual.min(novoTotal);

        invoice.setTotalAmount(novoTotal);
        invoice.setPaidAmount(novoPago);
        if (novoTotal.compareTo(BigDecimal.ZERO) == 0 || novoPago.compareTo(novoTotal) == 0) {
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaidAt(LocalDateTime.now());
        } else if (novoPago.compareTo(BigDecimal.ZERO) > 0) {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
            invoice.setPaidAt(null);
        } else if (invoice.getStatus() == InvoiceStatus.PARTIALLY_PAID) {
            invoice.setStatus(InvoiceStatus.OPEN);
            invoice.setPaidAt(null);
        }

        invoiceRepository.save(invoice);
        devolverLimiteAoCartao(invoice.getAccount(), valor);
    }

    /**
     * Paga (total ou parcialmente) uma fatura de cartão.
     *
     * ✅ ITEM 6: Agora recebe sourceAccountId — debita a conta corrente usada para pagar.
     *
     * @param invoiceId       ID da fatura a pagar
     * @param valorPago       Valor a ser pago
     * @param sourceAccountId Conta corrente/carteira de onde sai o dinheiro
     * @param userId          ID do usuário logado (para auditoria)
     */
    @Transactional
    public CreditCardInvoice pagarFatura(UUID invoiceId, BigDecimal valorPago,
                                         UUID sourceAccountId, UUID userId) {
        CreditCardInvoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new ObjectNotFoundException("Fatura não encontrada"));

        accountService.buscarContaComAcessoPermitido(invoice.getAccount().getId(), userId);

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new RuntimeException("Esta fatura já foi paga integralmente.");
        }

        if (valorPago == null || valorPago.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("O valor pago deve ser maior que zero.");
        }

        BigDecimal pagoAtual = invoice.getPaidAmount() != null
            ? invoice.getPaidAmount()
            : BigDecimal.ZERO;
        BigDecimal novoPagoTotal = pagoAtual.add(valorPago);
        if (novoPagoTotal.compareTo(invoice.getTotalAmount()) > 0) {
            throw new RuntimeException("Valor informado ultrapassa o total da fatura.");
        }

        // ✅ Debita a conta corrente usada para pagar a fatura (RN02)
        Account sourceAccount = accountService.buscarContaComAcessoPermitido(sourceAccountId, userId);

        if (sourceAccount.getType() == AccountType.CREDIT_CARD
                || sourceAccount.getType() == AccountType.INVESTMENT) {
            throw new RuntimeException(
                "A fatura deve ser paga com uma conta CHECKING ou CASH.");
        }

        balanceService.baixarSaldo(sourceAccount, valorPago);

        invoice.setPaidAmount(novoPagoTotal);
        if (novoPagoTotal.compareTo(invoice.getTotalAmount()) == 0) {
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaidAt(LocalDateTime.now());
            LocalDate inicioFatura = LocalDate.of(
                invoice.getReferenceYear(), invoice.getReferenceMonth(), 1);
            LocalDate fimFatura = YearMonth.of(
                invoice.getReferenceYear(), invoice.getReferenceMonth()).atEndOfMonth();
            installmentRepository.markInvoiceInstallmentsAsStatus(
                invoice.getId(),
                invoice.getAccount().getId(),
                inicioFatura,
                fimFatura,
                InstallmentStatus.PAID);
        } else {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        }
        invoiceRepository.save(invoice);

        // Devolve o limite disponível ao cartão
        devolverLimiteAoCartao(invoice.getAccount(), valorPago);

        auditService.log(
            userId, "INVOICE_PAID", "CreditCardInvoice", invoice.getId(),
            "Fatura " + invoice.getReferenceMonth() + "/" + invoice.getReferenceYear()
                + " do cartão '" + invoice.getAccount().getName() + "' paga"
                + " — R$" + valorPago + " via '" + sourceAccount.getName() + "'",
            valorPago
        );

        return invoice;
    }

    @Transactional
    public void fecharFaturasVencidas() {
        List<CreditCardInvoice> vencidas = invoiceRepository.findAbertasVencidas(LocalDate.now());
        vencidas.forEach(inv -> {
            inv.setStatus(InvoiceStatus.CLOSED);
            invoiceRepository.save(inv);
        });
        log.info("Faturas fechadas: {}", vencidas.size());
    }

    private void devolverLimiteAoCartao(Account account, BigDecimal valor) {
        int updated = accountRepository.restoreCreditLimit(account.getId(), valor);
        if (updated == 0) {
            throw new RuntimeException("Nao foi possivel devolver o limite disponivel do cartao.");
        }
    }

    private void consumirLimiteDoCartao(Account account, BigDecimal valor) {
        int updated = accountRepository.consumeCreditLimit(account.getId(), valor);
        if (updated > 0) {
            return;
        }

        Account atual = accountRepository.findById(account.getId()).orElse(account);
        BigDecimal disponivel = atual.getBalance() != null ? atual.getBalance() : BigDecimal.ZERO;
        throw new RuntimeException(
            "Limite insuficiente no cartao: " + atual.getName()
                + ". Disponivel: R$" + disponivel + ", necessario: R$" + valor);
    }

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    public List<CreditCardInvoice> listarFaturasDoCartao(UUID accountId, UUID userId) {
        accountService.buscarContaComAcessoPermitido(accountId, userId);
        return invoiceRepository
            .findByAccountIdOrderByReferenceYearDescReferenceMonthDesc(accountId);
    }

    public List<CreditCardInvoice> listarFaturasPendentesDoUsuario(UUID userId) {
        return invoiceRepository.findPendingInvoicesByUserId(userId);
    }
}
