package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.evely.financas.enums.AccountType;
import com.evely.financas.enums.InvestmentEntryType;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.InvestmentEntry;
import com.evely.financas.model.Snapshot;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.SnapshotRepository;
import com.evely.financas.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import com.evely.financas.enums.InvestmentEntryType;
import com.evely.financas.model.InvestmentEntry;
import com.evely.financas.repository.InvestmentEntryRepository;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final SnapshotRepository snapshotRepository;
    private final InvestmentEntryRepository investmentEntryRepository;

    @Transactional
    public Account salvar(Account account) {
        UUID ownerId = account.getOwner().getId();

        userRepository.findById(ownerId)
            .orElseThrow(() -> new ObjectNotFoundException(
                "Não foi possível criar a conta: Usuário dono não encontrado!"));

        Account salva = accountRepository.save(account);

        if (salva.getType() == AccountType.CREDIT_CARD) {
            // Cartão nasce com snapshot igual ao limite disponível
            BigDecimal limiteInicial = salva.getCardLimit() != null
                ? salva.getCardLimit()
                : BigDecimal.ZERO;
            criarSnapshot(salva, limiteInicial);

        } else {
            BigDecimal saldoInicial = account.getInitialBalance() != null
                ? account.getInitialBalance()
                : BigDecimal.ZERO;

            // Para investimentos: cria InvestmentEntry em vez de (só) snapshot
            // InvestmentService.calcularSaldo() lê InvestmentEntry, não snapshot
            if (salva.getType() == AccountType.INVESTMENT && saldoInicial.compareTo(BigDecimal.ZERO) > 0) {
                InvestmentEntry entryInicial = new InvestmentEntry();
                entryInicial.setAccount(salva);
                entryInicial.setType(InvestmentEntryType.DEPOSIT);
                entryInicial.setAmount(saldoInicial);
                entryInicial.setEntryDate(java.time.LocalDate.now());
                entryInicial.setNotes("Saldo inicial");
                investmentEntryRepository.save(entryInicial);
            }

            criarSnapshot(salva, saldoInicial);
        }

        return salva;
    }

    /**
     * Permite definir (ou corrigir) o saldo inicial de uma conta existente.
     * Útil para o onboarding quando o usuário precisa informar o saldo atual
     * de uma conta que já foi criada (ex: a carteira CASH automática).
     * Cria um novo snapshot — o histórico anterior é preservado.
     */
    @Transactional
    public void definirSaldoInicial(UUID accountId, BigDecimal novoSaldo, UUID userId) {
        Account conta = accountRepository.findById(accountId)
            .orElseThrow(() -> new ObjectNotFoundException("Conta não encontrada"));

        if (!conta.getOwner().getId().equals(userId)) {
            throw new RuntimeException("Sem permissão para editar o saldo desta conta.");
        }

        if (conta.getType() == AccountType.CREDIT_CARD) {
            throw new RuntimeException(
                "O saldo de um cartão de crédito é gerenciado pelo sistema " +
                "através do limite e das faturas.");
        }

        if (novoSaldo.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("O saldo inicial não pode ser negativo.");
        }

        criarSnapshot(conta, novoSaldo);
    }

    public List<Account> listarTodas() {
        return accountRepository.findAll();
    }

    public void excluir(UUID id) {
        accountRepository.deleteById(id);
    }

    public Account editar(UUID id, Account accountAtualizada) {
        Account accountExistente = accountRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException(
                "Conta não encontrada com o ID: " + id));

        accountExistente.setName(accountAtualizada.getName());
        accountExistente.setType(accountAtualizada.getType());
        accountExistente.setClosingDay(accountAtualizada.getClosingDay());
        accountExistente.setDueDay(accountAtualizada.getDueDay());
        accountExistente.setCardLimit(accountAtualizada.getCardLimit());
        accountExistente.setOwner(accountAtualizada.getOwner());

        return accountRepository.save(accountExistente);
    }

    // -------------------------------------------------------------------------
    // PRIVADO
    // -------------------------------------------------------------------------

    private void criarSnapshot(Account conta, BigDecimal valor) {
        Snapshot snapshot = new Snapshot();
        snapshot.setAccount(conta);
        snapshot.setAmount(valor);
        snapshot.setSnapshotDate(LocalDateTime.now());
        snapshotRepository.save(snapshot);
    }
}