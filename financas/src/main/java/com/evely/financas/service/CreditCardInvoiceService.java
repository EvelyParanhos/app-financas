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
import com.evely.financas.enums.InvoiceStatus;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.CreditCardInvoice;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.CreditCardInvoiceRepository;
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
        invoice.setTotalAmount(invoice.getTotalAmount().add(valor));
        invoiceRepository.save(invoice);
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

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new RuntimeException("Esta fatura já foi paga integralmente.");
        }

        BigDecimal novoPagoTotal = invoice.getPaidAmount().add(valorPago);
        if (novoPagoTotal.compareTo(invoice.getTotalAmount()) > 0) {
            throw new RuntimeException("Valor informado ultrapassa o total da fatura.");
        }

        // ✅ Debita a conta corrente usada para pagar a fatura (RN02)
        Account sourceAccount = accountRepository.findById(sourceAccountId)
            .orElseThrow(() -> new ObjectNotFoundException("Conta de pagamento não encontrada"));

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
        accountRepository.incrementBalance(account.getId(), valor);
        accountRepository.findById(account.getId()).ifPresent(acc -> {
            if (acc.getCardLimit() != null && acc.getBalance().compareTo(acc.getCardLimit()) > 0) {
                accountRepository.setBalance(acc.getId(), acc.getCardLimit());
            }
        });
    }

    public List<CreditCardInvoice> listarFaturasDoCartao(UUID accountId) {
        return invoiceRepository
            .findByAccountIdOrderByReferenceYearDescReferenceMonthDesc(accountId);
    }

    public List<CreditCardInvoice> listarFaturasPendentesDoUsuario(UUID userId) {
        return invoiceRepository.findPendingInvoicesByUserId(userId);
    }
}