package com.evely.financas.service;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.enums.InvestmentEntryType;
import com.evely.financas.enums.InvoiceStatus;
import com.evely.financas.enums.TransactionType;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Account;
import com.evely.financas.model.CreditCardInvoice;
import com.evely.financas.model.Installment;
import com.evely.financas.model.InvestmentEntry;
import com.evely.financas.repository.InstallmentRepository;
import com.evely.financas.repository.InvestmentEntryRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EstornoService {

    private final InstallmentRepository installmentRepository;
    private final BalanceService balanceService;
    private final InvestmentEntryRepository investmentEntryRepository;
    private final AuditService auditService;
    private final CreditCardInvoiceService creditCardInvoiceService;

    @Transactional
    public Installment estornarParcela(UUID installmentId, UUID userId) {
        Installment parcela = installmentRepository.findById(installmentId)
            .orElseThrow(() -> new ObjectNotFoundException("Parcela não encontrada."));

        if (parcela.getPayer() == null || !parcela.getPayer().getId().equals(userId)) {
            throw new RuntimeException("Você não tem permissão para estornar esta parcela.");
        }

        if (parcela.getStatus() != InstallmentStatus.PAID) {
            throw new RuntimeException("Apenas parcelas com status PAID podem ser estornadas.");
        }

        TransactionType tipo = parcela.getTransaction().getType();
        Account conta = parcela.getTransaction().getAccount();

        if (tipo == TransactionType.INTERNAL_REPAYMENT) {
            Account investimento = parcela.getTransaction().getDestinationAccount();

            balanceService.subirSaldo(conta, parcela.getAmount());

            InvestmentEntry estorno = new InvestmentEntry();
            estorno.setAccount(investimento);
            estorno.setType(InvestmentEntryType.WITHDRAWAL);
            estorno.setAmount(parcela.getAmount());
            estorno.setEntryDate(LocalDate.now());
            estorno.setNotes("Estorno de reposição — parcela " + parcela.getInstallmentNumber());
            investmentEntryRepository.save(estorno);

            parcela.setStatus(InstallmentStatus.PENDING);
            Installment salva = installmentRepository.save(parcela);

            auditService.log(
                userId, "INSTALLMENT_REVERSED", "Installment", parcela.getId(),
                "Estorno de reposição auto-empréstimo — parcela #" + parcela.getInstallmentNumber()
                    + " de '" + parcela.getTransaction().getDescription() + "'"
                    + " — R$" + parcela.getAmount(),
                parcela.getAmount()
            );

            return salva;
        }

        if (parcela.getInvoice() != null) {
            CreditCardInvoice invoice = parcela.getInvoice();

            if (invoice.getStatus() == InvoiceStatus.PAID) {
                throw new RuntimeException(
                    "A fatura desta parcela já foi paga integralmente. " +
                    "Para estornar, entre em contato com o suporte.");
            }

            creditCardInvoiceService.removerValorDaFatura(invoice, parcela.getAmount());
            parcela.setStatus(InstallmentStatus.PENDING);
            Installment salva = installmentRepository.save(parcela);

            auditService.log(
                userId, "INSTALLMENT_REVERSED", "Installment", parcela.getId(),
                "Estorno de parcela de cartão — '"
                    + parcela.getTransaction().getDescription() + "'"
                    + " — R$" + parcela.getAmount(),
                parcela.getAmount()
            );

            return salva;
        }

        switch (tipo) {
            case EXPENSE  -> balanceService.subirSaldo(conta, parcela.getAmount());
            case INCOME   -> balanceService.baixarSaldo(conta, parcela.getAmount());
            case LOAN_OUT -> balanceService.subirSaldo(conta, parcela.getAmount());
            default -> throw new RuntimeException(
                "Tipo de transação '" + tipo + "' não suporta estorno direto.");
        }

        parcela.setStatus(InstallmentStatus.PENDING);
        Installment salva = installmentRepository.save(parcela);

        auditService.log(
            userId, "INSTALLMENT_REVERSED", "Installment", parcela.getId(),
            "Estorno de parcela #" + parcela.getInstallmentNumber()
                + " de '" + parcela.getTransaction().getDescription() + "'"
                + " — R$" + parcela.getAmount(),
            parcela.getAmount()
        );

        return salva;
    }
}
