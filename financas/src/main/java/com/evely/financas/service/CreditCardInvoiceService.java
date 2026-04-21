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
    // ✅ SnapshotRepository REMOVIDO — limite disponível agora está em account.balance

    /**
     * Resolve em qual mês a primeira parcela de uma compra no cartão
     * deve entrar, com base no dia de fechamento da fatura.
     * Se a compra for APÓS o dia de fechamento, vai para o mês seguinte.
     */
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
        // ✅ Proteção contra closingDay inválido para o mês (ex: 31 em fevereiro)
        int diasNoMes = YearMonth.of(ano, mes).lengthOfMonth();
        int closingDia = Math.min(account.getClosingDay(), diasNoMes);
        LocalDate closingDate = LocalDate.of(ano, mes, closingDia);

        // Vencimento = dia seguinte ao fechamento + 1 mês (ex: fecha dia 10, vence dia 10 do mês seguinte)
        int dueDia = Math.min(account.getDueDay(), YearMonth.of(ano, mes + 1 > 12 ? 1 : mes + 1).lengthOfMonth());
        LocalDate dueDate = closingDate.plusMonths(1).withDayOfMonth(dueDia);

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

    @Transactional
    public CreditCardInvoice pagarFatura(UUID invoiceId, BigDecimal valorPago) {
        CreditCardInvoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new ObjectNotFoundException("Fatura não encontrada"));

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new RuntimeException("Esta fatura já foi paga integralmente.");
        }

        BigDecimal novoPagoTotal = invoice.getPaidAmount().add(valorPago);
        if (novoPagoTotal.compareTo(invoice.getTotalAmount()) > 0) {
            throw new RuntimeException("Valor informado ultrapassa o total da fatura.");
        }

        // RN02: aqui o saldo bancário da conta de pagamento (corrente/carteira)
        // é debitado. O cartão em si tem o limite devolvido.
        // Quem chama este método deve também debitar a conta corrente usada para pagar.
        // Exemplo: balanceService.baixarSaldo(contaCorrente, valorPago) ANTES de chamar aqui.

        invoice.setPaidAmount(novoPagoTotal);
        if (novoPagoTotal.compareTo(invoice.getTotalAmount()) == 0) {
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaidAt(LocalDateTime.now());
        } else {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        }
        invoiceRepository.save(invoice);

        // ✅ Devolve o limite disponível ao cartão via update atômico na coluna balance
        devolverLimiteAoCartao(invoice.getAccount(), valorPago);

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

    /**
     * ✅ Devolve o limite ao cartão via update atômico (incrementBalance).
     * Anteriormente usava Snapshot — substituído pela coluna balance.
     * Garante que o limite não ultrapasse o cardLimit configurado.
     */
    private void devolverLimiteAoCartao(Account account, BigDecimal valor) {
        // Incrementa o limite disponível
        accountRepository.incrementBalance(account.getId(), valor);

        // Garante que não ultrapasse o limite máximo do cartão
        // Re-lê o saldo atual pós-incremento
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