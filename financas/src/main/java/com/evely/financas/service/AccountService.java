package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.InvoiceStatus;
import com.evely.financas.enums.InvestmentEntryType;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.CreditCardInvoice;
import com.evely.financas.model.InvestmentEntry;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.CreditCardInvoiceRepository;
import com.evely.financas.repository.InvestmentEntryRepository;
import com.evely.financas.repository.PartnershipRepository;
import com.evely.financas.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final InvestmentEntryRepository investmentEntryRepository;
    private final PartnershipRepository partnershipRepository;
    private final CreditCardInvoiceRepository creditCardInvoiceRepository;

    @Transactional
    public Account salvar(Account account) {
        UUID ownerId = account.getOwner().getId();
        account.setActive(true);

        userRepository.findById(ownerId)
            .orElseThrow(() -> new ObjectNotFoundException(
                "Não foi possível criar a conta: Usuário dono não encontrado!"));

        if (account.getType() == AccountType.CREDIT_CARD) {
            if (account.getCardLimit() != null && account.getCardLimit().compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException("O limite do cartao nao pode ser negativo.");
            }
            if (account.getClosingDay() == null || account.getDueDay() == null) {
                throw new RuntimeException("Cartão de crédito exige dia de fechamento e vencimento.");
            }
        }

        Account salva = accountRepository.save(account);

        if (salva.getType() == AccountType.CREDIT_CARD) {
            accountRepository.setBalance(
                salva.getId(),
                salva.getCardLimit() != null ? salva.getCardLimit() : BigDecimal.ZERO
            );
            criarFaturaInicialAberta(salva, account.getInitialOpenInvoiceAmount());
        } else {
            BigDecimal saldoInicial = account.getInitialBalance() != null
                ? account.getInitialBalance()
                : BigDecimal.ZERO;

            if (salva.getType() == AccountType.INVESTMENT && saldoInicial.compareTo(BigDecimal.ZERO) > 0) {
                InvestmentEntry entryInicial = new InvestmentEntry();
                entryInicial.setAccount(salva);
                entryInicial.setType(InvestmentEntryType.DEPOSIT);
                entryInicial.setAmount(saldoInicial);
                entryInicial.setEntryDate(LocalDate.now());
                entryInicial.setNotes("Saldo inicial");
                investmentEntryRepository.save(entryInicial);
            } else if (salva.getType() != AccountType.INVESTMENT) {
                accountRepository.setBalance(salva.getId(), saldoInicial);
            }
        }

        return salva;
    }

    private void criarFaturaInicialAberta(Account conta, BigDecimal valorAberto) {
        if (valorAberto == null || valorAberto.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        YearMonth referencia = YearMonth.now();
        int diaFechamento = Math.min(conta.getClosingDay(), referencia.lengthOfMonth());
        LocalDate fechamento = referencia.atDay(diaFechamento);

        YearMonth vencimento = referencia.plusMonths(1);
        int diaVencimento = Math.min(conta.getDueDay(), vencimento.lengthOfMonth());

        CreditCardInvoice invoice = new CreditCardInvoice();
        invoice.setAccount(conta);
        invoice.setReferenceMonth(referencia.getMonthValue());
        invoice.setReferenceYear(referencia.getYear());
        invoice.setClosingDate(fechamento);
        invoice.setDueDate(vencimento.atDay(diaVencimento));
        invoice.setTotalAmount(valorAberto);
        invoice.setPaidAmount(BigDecimal.ZERO);
        invoice.setStatus(InvoiceStatus.OPEN);

        creditCardInvoiceRepository.save(invoice);

        int updated = accountRepository.consumeCreditLimit(conta.getId(), valorAberto);
        if (updated == 0) {
            throw new RuntimeException("Limite insuficiente para registrar a fatura inicial do cartao.");
        }
    }

    @Transactional
    public void definirSaldoInicial(UUID accountId, BigDecimal novoSaldo, UUID userId) {
        Account conta = accountRepository.findByIdAndActiveTrue(accountId)
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));

        if (!conta.getOwner().getId().equals(userId)) {
            throw new RuntimeException("Sem permissão para editar o saldo desta conta.");
        }
        if (conta.getType() == AccountType.CREDIT_CARD) {
            throw new RuntimeException(
                "O saldo do cartão é gerenciado pelo sistema via limite e faturas.");
        }
        if (conta.getType() == AccountType.INVESTMENT) {
            throw new RuntimeException(
                "Para lançar saldo em um investimento, use POST /api/investments/entry.");
        }
        if (novoSaldo.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("O saldo inicial não pode ser negativo.");
        }

        accountRepository.setBalance(accountId, novoSaldo);
    }

    public Account buscarContaComAcessoPermitido(UUID accountId, UUID userId) {
        Account conta = accountRepository.findByIdAndActiveTrue(accountId)
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));

        if (conta.getOwner().getId().equals(userId)) return conta;

        boolean parceiroDaConta = conta.isShared()
            && partnershipRepository.findByUserId(userId)
                .map(p -> p.getUserA().getId().equals(conta.getOwner().getId())
                       || p.getUserB().getId().equals(conta.getOwner().getId()))
                .orElse(false);

        if (parceiroDaConta) return conta;

        throw new RuntimeException(
            "Você não tem permissão para usar esta conta. " +
            "Contas de parceiros só são acessíveis se estiverem marcadas como compartilhadas.");
    }

    /**
     * ✅ ITEM 10: Lista as contas do usuário + as contas compartilhadas do parceiro.
     *
     * Usado pelo frontend ao criar transações ou recorrentes —
     * precisa ver também as contas do casal para poder lançar nelas.
     *
     * Contas retornadas do parceiro: apenas as marcadas como is_shared = true.
     * Contas próprias: todas (independente de is_shared).
     */
    public List<Account> listarComParceiroOpcional(UUID userId) {
        List<Account> minhas = accountRepository.findByOwnerId(userId);

        List<Account> doParceiroShared = partnershipRepository.findByUserId(userId)
            .map(p -> {
                UUID partnerId = p.getUserA().getId().equals(userId)
                    ? p.getUserB().getId()
                    : p.getUserA().getId();
                return accountRepository.findByOwnerIdAndSharedTrue(partnerId);
            })
            .orElse(List.of());

        return Stream.concat(minhas.stream(), doParceiroShared.stream()).toList();
    }

    @Transactional
    public void excluir(UUID id) {
        Account conta = accountRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));
        conta.setActive(false);
        accountRepository.save(conta);
    }

    @Transactional
    public Account editar(UUID id, Account accountAtualizada) {
        Account accountExistente = accountRepository.findByIdAndActiveTrue(id)
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada com o ID: " + id));

        if (accountExistente.getType() == AccountType.CREDIT_CARD) {
            if (accountAtualizada.getCardLimit() != null
                    && accountAtualizada.getCardLimit().compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException("O limite do cartao nao pode ser negativo.");
            }
            if (accountAtualizada.getClosingDay() == null || accountAtualizada.getDueDay() == null) {
                throw new RuntimeException("Cartao de credito exige dia de fechamento e vencimento.");
            }
            accountExistente.setClosingDay(accountAtualizada.getClosingDay());
            accountExistente.setDueDay(accountAtualizada.getDueDay());
            accountExistente.setCardLimit(accountAtualizada.getCardLimit());
        }

        accountExistente.setName(accountAtualizada.getName());

        return accountRepository.save(accountExistente);
    }
}
