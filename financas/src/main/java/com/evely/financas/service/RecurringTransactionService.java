package com.evely.financas.service;

import java.time.LocalDate;
import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import com.evely.financas.model.RecurringTransaction;
import com.evely.financas.model.Transaction;
import com.evely.financas.repository.RecurringTransactionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecurringTransactionService {

    private final RecurringTransactionRepository recurringRepository;
    private final TransactionService transactionService;
    private final CreditCardInvoiceService invoiceService;

    @Scheduled(cron = "0 0 1 * * ?")
    @Transactional
    public void processarTransacoesRecorrentes() {
        int diaDeHoje = LocalDate.now().getDayOfMonth();

        // Busca tudo que vence no dia
        List<RecurringTransaction> moldes = recurringRepository.findByDayOfMonth(diaDeHoje);

        for (RecurringTransaction molde : moldes) {
            Transaction novaTransacao = new Transaction();
            novaTransacao.setDescription("[RECORRENTE] " + molde.getDescription());
            novaTransacao.setTotalAmount(molde.getEstimatedAmount());
            novaTransacao.setType(molde.getType());
            novaTransacao.setAccount(molde.getAccount());
            novaTransacao.setCategory(molde.getCategory());
            novaTransacao.setPurchaseDate(LocalDate.now());

            transactionService.registrarTransacao(novaTransacao, 1, molde.getAccount().getOwner().getId());
        }
    }

    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void fecharFaturasDoMes() {
        invoiceService.fecharFaturasVencidas();
        log.info("Verificação de fechamento de faturas concluída.");
    }
}