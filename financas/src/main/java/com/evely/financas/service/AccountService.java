package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.InvestmentEntryType;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.InvestmentEntry;
import com.evely.financas.repository.AccountRepository;
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

    @Transactional
    public Account salvar(Account account) {
        UUID ownerId = account.getOwner().getId();

        userRepository.findById(ownerId)
            .orElseThrow(() -> new ObjectNotFoundException(
                "Não foi possível criar a conta: Usuário dono não encontrado!"));

        if (account.getType() == AccountType.CREDIT_CARD) {
            if (account.getCardLimit() == null || account.getCardLimit().compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("Cartão de crédito exige um limite maior que zero.");
            }
            if (account.getClosingDay() == null || account.getDueDay() == null) {
                throw new RuntimeException("Cartão de crédito exige dia de fechamento e vencimento.");
            }
        }

        Account salva = accountRepository.save(account);

        if (salva.getType() == AccountType.CREDIT_CARD) {
            accountRepository.setBalance(salva.getId(), salva.getCardLimit());
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

    @Transactional
    public void definirSaldoInicial(UUID accountId, BigDecimal novoSaldo, UUID userId) {
        Account conta = accountRepository.findById(accountId)
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

    /**
     * Busca uma conta validando que o usuário tem permissão de uso.
     * Permite acesso se:
     *   a) o usuário é o dono da conta, OU
     *   b) a conta é compartilhada (is_shared = true) e o dono é parceiro do usuário.
     *
     * Usado pelo RecurringTransactionController para permitir que
     * um parceiro crie recorrentes apontando para a conta de investimento
     * compartilhada do outro (ex: "Reserva do Casal" de posse do marido).
     */
    public Account buscarContaComAcessoPermitido(UUID accountId, UUID userId) {
        Account conta = accountRepository.findById(accountId)
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));

        // Dono direto — acesso irrestrito
        if (conta.getOwner().getId().equals(userId)) {
            return conta;
        }

        // Conta compartilhada de um parceiro ativo
        boolean parceiroDaConta = conta.isShared()
            && partnershipRepository.findByUserId(userId)
                .map(p -> p.getUserA().getId().equals(conta.getOwner().getId())
                       || p.getUserB().getId().equals(conta.getOwner().getId()))
                .orElse(false);

        if (parceiroDaConta) {
            return conta;
        }

        throw new RuntimeException(
            "Você não tem permissão para usar esta conta. " +
            "Contas de parceiros só são acessíveis se estiverem marcadas como compartilhadas.");
    }

    public void excluir(UUID id) {
        accountRepository.deleteById(id);
    }

    public Account editar(UUID id, Account accountAtualizada) {
        Account accountExistente = accountRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada com o ID: " + id));

        accountExistente.setName(accountAtualizada.getName());
        accountExistente.setType(accountAtualizada.getType());
        accountExistente.setClosingDay(accountAtualizada.getClosingDay());
        accountExistente.setDueDay(accountAtualizada.getDueDay());
        accountExistente.setCardLimit(accountAtualizada.getCardLimit());
        accountExistente.setOwner(accountAtualizada.getOwner());

        return accountRepository.save(accountExistente);
    }
}