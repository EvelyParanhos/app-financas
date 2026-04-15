package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.InvoiceStatus;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.CreditCardInvoice;
import com.evely.financas.model.Snapshot;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.CreditCardInvoiceRepository;
import com.evely.financas.repository.SnapshotRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CreditCardInvoiceService {

    private final CreditCardInvoiceRepository invoiceRepository;
    private final AccountRepository accountRepository;
    private final SnapshotRepository snapshotRepository;

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
        LocalDate closingDate = LocalDate.of(ano, mes, account.getClosingDay());

        LocalDate dueDate = closingDate.plusMonths(1).withDayOfMonth(account.getDueDay());

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

        invoice.setPaidAmount(novoPagoTotal);

        if (novoPagoTotal.compareTo(invoice.getTotalAmount()) == 0) {
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaidAt(LocalDateTime.now());
        } else {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        }

        invoiceRepository.save(invoice);

        devolverLimiteAoCartao(invoice.getAccount(), valorPago);

        return invoice;
    }


    @Transactional
    public void fecharFaturasVencidas() {
        List<CreditCardInvoice> abertas = invoiceRepository
            .findByAccountIdAndStatus(null, InvoiceStatus.OPEN); 

        LocalDate hoje = LocalDate.now();
        abertas.stream()
            .filter(inv -> !inv.getClosingDate().isAfter(hoje))
            .forEach(inv -> {
                inv.setStatus(InvoiceStatus.CLOSED);
                invoiceRepository.save(inv);
            });
    }

    private void devolverLimiteAoCartao(Account account, BigDecimal valor) {
        Snapshot ultimoSnapshot = snapshotRepository
            .findFirstByAccountOrderBySnapshotDateDesc(account)
            .orElseThrow(() -> new ObjectNotFoundException("Snapshot do cartão não encontrado"));

        BigDecimal novoLimiteDisponivel = ultimoSnapshot.getAmount().add(valor);

        if (novoLimiteDisponivel.compareTo(account.getCardLimit()) > 0) {
            novoLimiteDisponivel = account.getCardLimit();
        }

        Snapshot novoSnapshot = new Snapshot();
        novoSnapshot.setAccount(account);
        novoSnapshot.setAmount(novoLimiteDisponivel);
        novoSnapshot.setSnapshotDate(LocalDateTime.now());
        snapshotRepository.save(novoSnapshot);
    }

    public List<CreditCardInvoice> listarFaturasDoCartao(UUID accountId) {
        return invoiceRepository
            .findByAccountIdOrderByReferenceYearDescReferenceMonthDesc(accountId);
    }

    public List<CreditCardInvoice> listarFaturasPendentesDoUsuario(UUID userId) {
        return invoiceRepository.findPendingInvoicesByUserId(userId);
    }
}