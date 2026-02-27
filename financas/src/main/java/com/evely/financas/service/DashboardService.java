package com.evely.financas.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import org.springframework.stereotype.Service;
import com.evely.financas.dto.DashboardDTO;
import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.model.Account;
import com.evely.financas.model.Snapshot;
import com.evely.financas.repository.AccountRepository;
import com.evely.financas.repository.InstallmentRepository;
import com.evely.financas.repository.SnapshotRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final InstallmentRepository installmentRepository;
    private final AccountRepository accountRepository;
    private final SnapshotRepository snapshotRepository;

    public DashboardDTO getResumoIndividual (Integer userId) {
        LocalDate hoje = LocalDate.now();
        LocalDate inicioMes = hoje.with(TemporalAdjusters.firstDayOfMonth());
        LocalDate fimMes = hoje.with(TemporalAdjusters.lastDayOfMonth());

        BigDecimal totalDebts = installmentRepository.somarMensalPorUsuario(userId, InstallmentStatus.PENDING, inicioMes, fimMes);
        
        if (totalDebts ==  null) totalDebts = BigDecimal.ZERO;

        List<Account> contas = accountRepository.findByOwnerId(userId);

        BigDecimal currentBalance = contas.stream()
            .map(account -> snapshotRepository.findFirstByAccountOrderBySnapshotDateDesc(account)
            .map(Snapshot::getAmount).orElse(BigDecimal.ZERO))
            .reduce(BigDecimal.ZERO, BigDecimal::add); 


        BigDecimal leftover = currentBalance.subtract(totalDebts);

        return new DashboardDTO(totalDebts, currentBalance, leftover, false);
    }

    public DashboardDTO getResumoCasal(Integer idUser1, Integer idUser2) {
        DashboardDTO d1 = getResumoIndividual(idUser1);
        DashboardDTO d2 = getResumoIndividual(idUser2);

        return new DashboardDTO(
            d1.getTotalDebts().add(d2.getTotalDebts()),
            d1.getCurrentBalance().add(d2.getCurrentBalance()),
            d1.getLeftover().add(d2.getLeftover()),
            false
        );
    }   
}
