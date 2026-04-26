package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.evely.financas.dto.InvestmentProjectionDTO;
import com.evely.financas.enums.AccountType;
import com.evely.financas.model.Account;
import com.evely.financas.model.RecurringTransaction;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.PartnershipRepository;
import com.evely.financas.repository.RecurringTransactionRepository;
import lombok.RequiredArgsConstructor;

/**
 * Projeta o crescimento dos investimentos com base nos aportes recorrentes.
 *
 * Regra:
 *  1. Encontra todas as contas de INVESTIMENTO do usuário (próprias + compartilhadas).
 *  2. Para cada conta, soma os aportes recorrentes configurados — tanto do usuário
 *     quanto do parceiro (para a mesma conta compartilhada).
 *  3. Projeta: saldo_atual + (aporte_mensal_total × mês).
 *
 * Importante: a projeção é LINEAR e conservadora — não considera rendimentos futuros.
 * O rendimento real é registrado manualmente via InvestmentEntry YIELD.
 */
@Service
@RequiredArgsConstructor
public class InvestmentProjectionService {

    private final AccountRepository accountRepository;
    private final RecurringTransactionRepository recurringRepository;
    private final InvestmentService investmentService;
    private final PartnershipRepository partnershipRepository;

    public List<InvestmentProjectionDTO> projetarCrescimento(UUID userId, int months) {
        List<InvestmentProjectionDTO> resultado = new ArrayList<>();

        // Contas próprias de investimento
        List<Account> contasProprias = accountRepository.findByOwnerId(userId)
            .stream()
            .filter(a -> a.getType() == AccountType.INVESTMENT)
            .toList();

        // Contas compartilhadas do parceiro
        List<Account> contasCompartilhadas = partnershipRepository.findByUserId(userId)
            .map(p -> {
                UUID partnerId = p.getUserA().getId().equals(userId)
                    ? p.getUserB().getId() : p.getUserA().getId();
                return accountRepository.findByOwnerIdAndSharedTrue(partnerId)
                    .stream()
                    .filter(a -> a.getType() == AccountType.INVESTMENT)
                    .toList();
            })
            .orElse(List.of());

        // Une e deduplica
        List<Account> todasAsContas = java.util.stream.Stream
            .concat(contasProprias.stream(), contasCompartilhadas.stream())
            .distinct()
            .toList();

        // Descobre também o partnerId (para buscar recorrentes do parceiro)
        UUID partnerId = partnershipRepository.findByUserId(userId)
            .map(p -> p.getUserA().getId().equals(userId)
                ? p.getUserB().getId() : p.getUserA().getId())
            .orElse(null);

        for (Account conta : todasAsContas) {
            BigDecimal saldoAtual = investmentService.calcularSaldo(conta.getId());

            // Soma os aportes mensais RECORRENTES que apontam para esta conta
            // — do usuário e do parceiro (para contas compartilhadas)
            BigDecimal aporteMensalMeu = somarAportesRecorrentes(userId, conta.getId());
            BigDecimal aporteMensalParceiro = partnerId != null && conta.isShared()
                ? somarAportesRecorrentes(partnerId, conta.getId())
                : BigDecimal.ZERO;

            BigDecimal aporteMensalTotal = aporteMensalMeu.add(aporteMensalParceiro);

            // Gera projeção mês a mês
            LocalDate agora = LocalDate.now();
            for (int i = 1; i <= months; i++) {
                LocalDate mesFuturo = agora.plusMonths(i);
                BigDecimal saldoProjetado = saldoAtual.add(
                    aporteMensalTotal.multiply(BigDecimal.valueOf(i))
                );

                resultado.add(new InvestmentProjectionDTO(
                    mesFuturo.getMonthValue(),
                    mesFuturo.getYear(),
                    saldoProjetado,
                    aporteMensalTotal,
                    conta.getName()
                ));
            }
        }

        return resultado;
    }

    /**
     * Soma o valor estimado de todas as transações recorrentes de um usuário
     * que estão vinculadas a uma conta de investimento específica.
     */
    private BigDecimal somarAportesRecorrentes(UUID userId, UUID accountId) {
        return recurringRepository.findByUserId(userId)
            .stream()
            .filter(rt -> rt.getDestinationAccount() != null)
            .filter(rt -> rt.getDestinationAccount().getId().equals(accountId))
            .filter(rt -> rt.getDestinationAccount().getType() == AccountType.INVESTMENT)
            .map(rt -> rt.getEstimatedAmount() != null ? rt.getEstimatedAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
