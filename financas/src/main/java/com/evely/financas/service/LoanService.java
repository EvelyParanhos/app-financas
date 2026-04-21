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
import com.evely.financas.enums.InvestmentEntryType;
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
    private final InvestmentEntryRepository investmentEntryRepository;
    private final AuditService auditService;

    // =========================================================
    // EMPRÉSTIMO A TERCEIRO (RN12)
    // =========================================================

    @Transactional
    public Loan emprestarParaTerceiro(LoanOutDTO dto, UUID lenderId) {
        User lender = userRepository.findById(lenderId)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado"));

        Account sourceAccount = accountRepository.findById(dto.sourceAccountId())
            .orElseThrow(() -> new ObjectNotFoundException("Conta de origem não encontrada"));

        balanceService.validarSaldo(sourceAccount, dto.totalAmount());

        Transaction saida = new Transaction();
        saida.setDescription("Empréstimo para: " + dto.borrowerName());
        saida.setTotalAmount(dto.totalAmount());
        saida.setType(TransactionType.LOAN_OUT);
        saida.setAccount(sourceAccount);
        saida.setPurchaseDate(LocalDate.now());
        saida.setSimulation(false);
        Transaction transacaoSalva = transactionRepository.save(saida);

        balanceService.baixarSaldo(sourceAccount, dto.totalAmount());

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

        if (dto.borrowerUserId() != null) {
            User borrower = userRepository.findById(dto.borrowerUserId())
                .orElseThrow(() -> new ObjectNotFoundException("Devedor não encontrado no sistema"));
            loan.setBorrowerUser(borrower);
        }

        Loan salvo = loanRepository.save(loan);

        auditService.log(
            lenderId, "LOAN_CREATED", "Loan", salvo.getId(),
            "Empréstimo de R$" + dto.totalAmount() + " para '" + dto.borrowerName() + "'",
            dto.totalAmount()
        );

        return salvo;
    }

    // =========================================================
    // RECEBIMENTO DE VOLTA
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

        // Registra a entrada do dinheiro de volta
        Transaction entrada = new Transaction();
        entrada.setDescription("Recebimento de empréstimo: " + loan.getBorrowerName());
        entrada.setTotalAmount(valorRecebido);
        entrada.setType(TransactionType.INCOME);
        entrada.setAccount(loan.getSourceAccount());
        entrada.setPurchaseDate(LocalDate.now());
        entrada.setSimulation(false);
        transactionRepository.save(entrada);

        balanceService.subirSaldo(loan.getSourceAccount(), valorRecebido);

        loan.setPaidAmount(novoTotal);
        if (novoTotal.compareTo(loan.getTotalAmount()) == 0) {
            loan.setStatus(LoanStatus.PAID);
        }

        return loanRepository.save(loan);
    }

    // =========================================================
    // AUTO-EMPRÉSTIMO (RN11)
    //
    // REGRA DE USO:
    //   - COM intenção de repor → este endpoint (cria contrato de reposição)
    //   - SEM intenção de repor → InvestmentEntry WITHDRAWAL + transação EXPENSE normal
    //
    // ✅ FIX: Removidas as Transactions duplicadas (EXPENSE + INCOME)
    //    que causavam double-debit ao pagar as parcelas.
    //    O fluxo correto é:
    //      1. InvestmentEntry WITHDRAWAL (rastreia a saída do investimento)
    //      2. subirSaldo na conta destino (dinheiro chega na corrente)
    //      3. Transaction INTERNAL_REPAYMENT com parcelas flexíveis
    //         (ao pagar cada parcela: debitá na corrente + InvestmentEntry DEPOSIT)
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

        // Valida saldo da conta de origem
        balanceService.validarSaldo(sourceAccount, dto.totalAmount());

        // 1. Registra a saída como InvestmentEntry WITHDRAWAL (rastreia o movimento no investimento)
        InvestmentEntry saida = new InvestmentEntry();
        saida.setAccount(sourceAccount);
        saida.setType(InvestmentEntryType.WITHDRAWAL);
        saida.setAmount(dto.totalAmount());
        saida.setEntryDate(LocalDate.now());
        saida.setNotes("Auto-empréstimo — saída para: " + targetAccount.getName()
                       + (dto.notes() != null ? " | " + dto.notes() : ""));
        investmentEntryRepository.save(saida);

        // 2. Credita o valor na conta destino (dinheiro chega na corrente)
        balanceService.subirSaldo(targetAccount, dto.totalAmount());

        // 3. Cria o contrato de reposição (INTERNAL_REPAYMENT)
        //    account = onde o dinheiro SAI ao pagar (conta corrente/destino)
        //    destinationAccount = onde o dinheiro VOLTA (investimento/origem)
        Transaction reposicao = new Transaction();
        reposicao.setDescription("Reposição auto-empréstimo → " + sourceAccount.getName());
        reposicao.setTotalAmount(dto.totalAmount());
        reposicao.setType(TransactionType.INTERNAL_REPAYMENT);
        reposicao.setAccount(targetAccount);
        reposicao.setDestinationAccount(sourceAccount);
        reposicao.setPurchaseDate(LocalDate.now());
        reposicao.setSimulation(false);

        // Parcelas com datas e valores flexíveis (RN11)
        if (dto.installments() != null && !dto.installments().isEmpty()) {
            // Parcelas personalizadas (valores e datas diferentes)
            for (int i = 0; i < dto.installments().size(); i++) {
                var parcDTO = dto.installments().get(i);
                Installment parcela = new Installment();
                parcela.setInstallmentNumber(i + 1);
                parcela.setAmount(parcDTO.amount());
                parcela.setDueDate(parcDTO.dueDate());
                parcela.setStatus(InstallmentStatus.PENDING);
                parcela.setPayer(user);
                parcela.setTransaction(reposicao);
                reposicao.getInstallments().add(parcela);
            }
        } else if (dto.totalParcelas() > 0) {
            // Parcelas iguais, mensais a partir do mês seguinte
            BigDecimal valorParcela = dto.totalAmount()
                .divide(BigDecimal.valueOf(dto.totalParcelas()), 2, RoundingMode.HALF_UP);
            for (int i = 1; i <= dto.totalParcelas(); i++) {
                Installment parcela = new Installment();
                parcela.setInstallmentNumber(i);
                parcela.setAmount(valorParcela);
                parcela.setDueDate(LocalDate.now().plusMonths(i));
                parcela.setStatus(InstallmentStatus.PENDING);
                parcela.setPayer(user);
                parcela.setTransaction(reposicao);
                reposicao.getInstallments().add(parcela);
            }
        } else {
            throw new RuntimeException(
                "Informe as parcelas de reposição ou o número total de parcelas.");
        }

        transactionRepository.save(reposicao);

        // 4. Registra o empréstimo
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