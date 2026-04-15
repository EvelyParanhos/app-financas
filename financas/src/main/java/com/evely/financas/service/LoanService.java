package com.evely.financas.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.dto.LoanOutDTO;
import com.evely.financas.dto.SelfLoanDTO;
import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.enums.LoanStatus;
import com.evely.financas.enums.TransactionType;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.*;
import com.evely.financas.repository.*;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LoanService {

    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final BalanceService balanceService;

    // =========================================================
    // EMPRÉSTIMO A TERCEIRO
    // =========================================================

    @Transactional
    public Loan emprestarParaTerceiro(LoanOutDTO dto, UUID lenderId) {
        User lender = userRepository.findById(lenderId)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado"));

        Account sourceAccount = accountRepository.findById(dto.sourceAccountId())
            .orElseThrow(() -> new ObjectNotFoundException("Conta de origem não encontrada"));

        // Valida saldo antes de qualquer operação
        balanceService.validarSaldo(sourceAccount, dto.totalAmount());

        // Registra a saída do dinheiro
        Transaction saida = new Transaction();
        saida.setDescription("Empréstimo para: " + dto.borrowerName());
        saida.setTotalAmount(dto.totalAmount());
        saida.setType(TransactionType.LOAN_OUT);
        saida.setAccount(sourceAccount);
        saida.setPurchaseDate(LocalDate.now());
        saida.setSimulation(false);
        Transaction transacaoSalva = transactionRepository.save(saida);

        // Baixa o saldo da conta de origem
        balanceService.baixarSaldo(sourceAccount, dto.totalAmount());

        // Monta o registro do empréstimo
        Loan loan = new Loan();
        loan.setLender(lender);
        loan.setBorrowerName(dto.borrowerName());
        loan.setTotalAmount(dto.totalAmount());
        loan.setPaidAmount(BigDecimal.ZERO);
        loan.setSelfLoan(false);
        loan.setSourceAccount(sourceAccount);
        loan.setExpectedReturnDate(dto.expectedReturnDate());
        loan.setNotes(dto.notes());
        loan.setStatus(LoanStatus.ACTIVE);
        loan.setOriginTransaction(transacaoSalva);

        // Vincula ao usuário do sistema se o devedor também for usuário
        if (dto.borrowerUserId() != null) {
            User borrower = userRepository.findById(dto.borrowerUserId())
                .orElseThrow(() -> new ObjectNotFoundException("Devedor não encontrado no sistema"));
            loan.setBorrowerUser(borrower);
        }

        return loanRepository.save(loan);
    }

    // =========================================================
    // RECEBIMENTO DE VOLTA (empréstimo a terceiro)
    // =========================================================

    @Transactional
    public Loan registrarRecebimento(UUID loanId, BigDecimal valorRecebido) {
        Loan loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new ObjectNotFoundException("Empréstimo não encontrado"));

        if (loan.getStatus() == LoanStatus.PAID) {
            throw new RuntimeException("Este empréstimo já foi quitado.");
        }

        BigDecimal novoTotal = loan.getPaidAmount().add(valorRecebido);

        if (novoTotal.compareTo(loan.getTotalAmount()) > 0) {
            throw new RuntimeException("Valor recebido ultrapassa o total do empréstimo.");
        }

        // Registra a entrada do dinheiro de volta na conta
        Transaction entrada = new Transaction();
        entrada.setDescription("Recebimento de empréstimo: " + loan.getBorrowerName());
        entrada.setTotalAmount(valorRecebido);
        entrada.setType(TransactionType.INCOME);
        entrada.setAccount(loan.getSourceAccount());
        entrada.setPurchaseDate(LocalDate.now());
        entrada.setSimulation(false);
        transactionRepository.save(entrada);

        // Dinheiro volta para a conta de origem — estava faltando isso
        balanceService.subirSaldo(loan.getSourceAccount(), valorRecebido);

        loan.setPaidAmount(novoTotal);
        if (novoTotal.compareTo(loan.getTotalAmount()) == 0) {
            loan.setStatus(LoanStatus.PAID);
        }

        return loanRepository.save(loan);
    }

    // =========================================================
    // AUTO-EMPRÉSTIMO
    // =========================================================

    @Transactional
    public Loan criarAutoEmprestimo(SelfLoanDTO dto, UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado"));

        Account sourceAccount = accountRepository.findById(dto.sourceAccountId())
            .orElseThrow(() -> new ObjectNotFoundException("Conta de origem não encontrada"));

        Account targetAccount = accountRepository.findById(dto.targetAccountId())
            .orElseThrow(() -> new ObjectNotFoundException("Conta de destino não encontrada"));

        if (sourceAccount.getId().equals(targetAccount.getId())) {
            throw new RuntimeException("Conta de origem e destino não podem ser a mesma.");
        }

        // Valida saldo antes de qualquer operação
        balanceService.validarSaldo(sourceAccount, dto.totalAmount());

        // Registra transação de saída
        Transaction saida = new Transaction();
        saida.setDescription("Auto-empréstimo — saída de: " + sourceAccount.getName());
        saida.setTotalAmount(dto.totalAmount());
        saida.setType(TransactionType.EXPENSE);
        saida.setAccount(sourceAccount);
        saida.setPurchaseDate(LocalDate.now());
        saida.setSimulation(false);
        transactionRepository.save(saida);

        // Registra transação de entrada
        Transaction entrada = new Transaction();
        entrada.setDescription("Auto-empréstimo — entrada em: " + targetAccount.getName());
        entrada.setTotalAmount(dto.totalAmount());
        entrada.setType(TransactionType.INCOME);
        entrada.setAccount(targetAccount);
        entrada.setPurchaseDate(LocalDate.now());
        entrada.setSimulation(false);
        transactionRepository.save(entrada);

        // Transfere atomicamente — baixar + subir em uma operação só
        balanceService.transferir(sourceAccount, targetAccount, dto.totalAmount());

        // Cria as parcelas de reposição
        BigDecimal valorParcela = dto.totalAmount()
            .divide(BigDecimal.valueOf(dto.parcelas()), 2, RoundingMode.HALF_UP);

        Transaction reposicao = new Transaction();
        reposicao.setDescription("Reposição auto-empréstimo — " + sourceAccount.getName());
        reposicao.setTotalAmount(dto.totalAmount());
        reposicao.setType(TransactionType.INTERNAL_REPAYMENT);
        reposicao.setAccount(targetAccount);           // sai da corrente
        reposicao.setDestinationAccount(sourceAccount); // volta para a reserva
        reposicao.setPurchaseDate(LocalDate.now());
        reposicao.setSimulation(false);

        for (int i = 1; i <= dto.parcelas(); i++) {
            Installment parcela = new Installment();
            parcela.setInstallmentNumber(i);
            parcela.setAmount(valorParcela);
            parcela.setStatus(InstallmentStatus.PENDING);
            parcela.setDueDate(LocalDate.now().plusMonths(i));
            parcela.setPayer(user);
            parcela.setTransaction(reposicao);
            reposicao.getInstallments().add(parcela);
        }

        transactionRepository.save(reposicao);

        // Registra o empréstimo
        Loan loan = new Loan();
        loan.setLender(user);
        loan.setSelfLoan(true);
        loan.setSourceAccount(sourceAccount);
        loan.setTargetAccount(targetAccount);
        loan.setTotalAmount(dto.totalAmount());
        loan.setPaidAmount(BigDecimal.ZERO);
        loan.setStatus(LoanStatus.ACTIVE);
        loan.setNotes(dto.notes());
        loan.setOriginTransaction(reposicao);

        return loanRepository.save(loan);
    }

    // =========================================================
    // ATUALIZAR PROGRESSO (chamado ao pagar parcela de reposição)
    // =========================================================

    @Transactional
    public void atualizarProgressoAutoEmprestimo(UUID loanId, BigDecimal valorPago) {
        Loan loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new ObjectNotFoundException("Empréstimo não encontrado"));

        BigDecimal novoTotal = loan.getPaidAmount().add(valorPago);
        loan.setPaidAmount(novoTotal);

        if (novoTotal.compareTo(loan.getTotalAmount()) >= 0) {
            loan.setStatus(LoanStatus.PAID);
        }

        loanRepository.save(loan);
    }

    // =========================================================
    // PERDOAR EMPRÉSTIMO
    // =========================================================

    @Transactional
    public Loan perdoarEmprestimo(UUID loanId, UUID userId) {
        Loan loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new ObjectNotFoundException("Empréstimo não encontrado"));

        if (!loan.getLender().getId().equals(userId)) {
            throw new RuntimeException("Você não tem permissão para perdoar este empréstimo.");
        }

        if (loan.isSelfLoan()) {
            throw new RuntimeException("Não é possível perdoar um auto-empréstimo.");
        }

        loan.setStatus(LoanStatus.FORGIVEN);
        return loanRepository.save(loan);
    }

    // =========================================================
    // CONSULTAS
    // =========================================================

    public List<Loan> listarEmprestimosAtivos(UUID userId) {
        return loanRepository.findActiveLoansByUser(userId);
    }

    public BigDecimal totalAReceber(UUID userId) {
        BigDecimal total = loanRepository.totalAReceber(userId);
        return total != null ? total : BigDecimal.ZERO;
    }
}