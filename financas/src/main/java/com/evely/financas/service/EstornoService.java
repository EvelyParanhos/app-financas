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
import com.evely.financas.repository.CreditCardInvoiceRepository;
import com.evely.financas.repository.InstallmentRepository;
import com.evely.financas.repository.InvestmentEntryRepository;
import lombok.RequiredArgsConstructor;

/**
 * Serviço de Estorno (RN13)
 *
 * RN13 diz: É proibido DELETAR uma transação com parcelas PAID.
 * O estorno é a operação inversa — desfaz o efeito financeiro
 * de uma parcela paga sem apagar o histórico.
 *
 * Após o estorno, a parcela volta para PENDING e pode ser
 * paga novamente pelo valor correto.
 */
@Service
@RequiredArgsConstructor
public class EstornoService {

    private final InstallmentRepository installmentRepository;
    private final BalanceService balanceService;
    private final CreditCardInvoiceRepository invoiceRepository;
    private final InvestmentEntryRepository investmentEntryRepository;

    @Transactional
    public Installment estornarParcela(UUID installmentId, UUID userId) {
        Installment parcela = installmentRepository.findById(installmentId)
            .orElseThrow(() -> new ObjectNotFoundException("Parcela não encontrada."));

        // Somente o pagador pode estornar sua parcela
        if (parcela.getPayer() == null || !parcela.getPayer().getId().equals(userId)) {
            throw new RuntimeException("Você não tem permissão para estornar esta parcela.");
        }

        if (parcela.getStatus() != InstallmentStatus.PAID) {
            throw new RuntimeException("Apenas parcelas com status PAID podem ser estornadas.");
        }

        TransactionType tipo = parcela.getTransaction().getType();
        Account conta = parcela.getTransaction().getAccount();

        // ----------------------------------------------------------------
        // INTERNAL_REPAYMENT — estorna a reposição do auto-empréstimo
        // Dinheiro volta para a corrente e sai do investimento
        // ----------------------------------------------------------------
        if (tipo == TransactionType.INTERNAL_REPAYMENT) {
            Account investimento = parcela.getTransaction().getDestinationAccount();

            // Reverte o lançamento: volta para a corrente
            balanceService.subirSaldo(conta, parcela.getAmount());

            // Retira do investimento (cria WITHDRAWAL no histórico)
            InvestmentEntry estorno = new InvestmentEntry();
            estorno.setAccount(investimento);
            estorno.setType(InvestmentEntryType.WITHDRAWAL);
            estorno.setAmount(parcela.getAmount());
            estorno.setEntryDate(LocalDate.now());
            estorno.setNotes("Estorno de reposição — parcela " + parcela.getInstallmentNumber());
            investmentEntryRepository.save(estorno);

            parcela.setStatus(InstallmentStatus.PENDING);
            return installmentRepository.save(parcela);
        }

        // ----------------------------------------------------------------
        // Cartão de crédito — estorno afeta a fatura
        // ----------------------------------------------------------------
        if (parcela.getInvoice() != null) {
            CreditCardInvoice invoice = parcela.getInvoice();

            if (invoice.getStatus() == InvoiceStatus.PAID) {
                throw new RuntimeException(
                    "A fatura desta parcela já foi paga integralmente. " +
                    "Para estornar, entre em contato com o suporte.");
            }

            // Reduz o valor pago na fatura e reabre se necessário
            if (invoice.getPaidAmount().compareTo(parcela.getAmount()) >= 0) {
                invoice.setPaidAmount(invoice.getPaidAmount().subtract(parcela.getAmount()));
                invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
                invoiceRepository.save(invoice);
            }

            // Remove o limite do cartão que havia sido devolvido ao pagar
            // (o pagamento da fatura devolve limite — estornar retira de volta)
            balanceService.baixarSaldo(conta, parcela.getAmount());

            parcela.setStatus(InstallmentStatus.PENDING);
            return installmentRepository.save(parcela);
        }

        // ----------------------------------------------------------------
        // Conta corrente / carteira — reverte o efeito de caixa
        // ----------------------------------------------------------------
        switch (tipo) {
            case EXPENSE  -> balanceService.subirSaldo(conta, parcela.getAmount()); // devolveu
            case INCOME   -> balanceService.baixarSaldo(conta, parcela.getAmount()); // desfaz entrada
            case LOAN_OUT -> balanceService.subirSaldo(conta, parcela.getAmount()); // dinheiro "voltou"
            default -> throw new RuntimeException(
                "Tipo de transação '" + tipo + "' não suporta estorno direto.");
        }

        parcela.setStatus(InstallmentStatus.PENDING);
        return installmentRepository.save(parcela);
    }
}