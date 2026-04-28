package com.evely.financas.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.dto.BudgetDTO;
import com.evely.financas.dto.BudgetStatusDTO;
import com.evely.financas.enums.AlertStatus;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Budget;
import com.evely.financas.model.Category;
import com.evely.financas.model.User;
import com.evely.financas.repository.BudgetRepository;
import com.evely.financas.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;

    @Transactional
    public Budget criar(BudgetDTO dto, User owner) {
        // Garante que a categoria pertence ao usuário logado
        Category category = categoryRepository.findByIdAndActiveTrue(dto.categoryId())
            .orElseThrow(() -> new ObjectNotFoundException("Categoria não encontrada"));

        if (!category.getOwner().getId().equals(owner.getId())) {
            throw new RuntimeException("Você não tem permissão sobre esta categoria.");
        }

        // Garante que não existe budget duplicado para o mesmo período
        budgetRepository.findByUserCategoryAndPeriod(
            owner.getId(),
            dto.categoryId(),
            dto.referenceMonth(),
            dto.referenceYear()
        ).ifPresent(b -> {
            throw new RuntimeException(
                "Já existe um budget para esta categoria neste período."
            );
        });

        Budget budget = new Budget();
        budget.setOwner(owner);
        budget.setCategory(category);
        budget.setAmountLimit(dto.amountLimit());
        budget.setAlertThreshold(dto.alertThreshold() == 0 ? 80 : dto.alertThreshold());
        budget.setReferenceMonth(dto.referenceMonth());
        budget.setReferenceYear(dto.referenceYear());

        return budgetRepository.save(budget);
    }

    @Transactional
    public Budget atualizar(UUID budgetId, BudgetDTO dto, User owner) {
        Budget budget = buscarComValidacao(budgetId, owner.getId());
        budget.setAmountLimit(dto.amountLimit());
        budget.setAlertThreshold(dto.alertThreshold());
        return budgetRepository.save(budget);
    }

    @Transactional
    public void excluir(UUID budgetId, User owner) {
        Budget budget = buscarComValidacao(budgetId, owner.getId());
        budgetRepository.delete(budget);
    }

    // Retorna o status de todos os budgets do mês com o gasto real calculado
    public List<BudgetStatusDTO> getStatusDoMes(UUID userId, int month, int year) {
        
        // 1. Usa a SUA query otimizada (JOIN FETCH) que busca os orçamentos do mês exato
        List<Budget> meusBudgets = budgetRepository.findByUserAndPeriod(userId, month, year);
        
        List<BudgetStatusDTO> listaStatus = new ArrayList<>();

        for (Budget budget : meusBudgets) {
            UUID categoryId = budget.getCategory().getId();

            // 2. Usa a SUA query perfeita que soma as parcelas (Installment) do mês
            BigDecimal gasto = budgetRepository.calcularGastoPorCategoria(
                    userId, categoryId, month, year
            );

            // 3. A SUA lógica matemática de percentual e status
            BigDecimal limite = budget.getAmountLimit();
            BigDecimal restante = limite.subtract(gasto);

            int percentual = 0;
            if (limite.compareTo(BigDecimal.ZERO) > 0) {
                percentual = gasto
                    .divide(limite, 4, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .intValue();
            }

            com.evely.financas.enums.AlertStatus status;
            if (percentual >= 100) {
                status = com.evely.financas.enums.AlertStatus.EXCEEDED;
            } else if (percentual >= budget.getAlertThreshold()) {
                status = com.evely.financas.enums.AlertStatus.WARNING;
            } else {
                status = com.evely.financas.enums.AlertStatus.OK;
            }

            // 4. Monta o DTO de Saída para o React
            listaStatus.add(new BudgetStatusDTO(
                    budget.getId(),
                    budget.getCategory().getName(),
                    limite,
                    gasto,
                    restante.max(BigDecimal.ZERO), // Nunca retorna negativo
                    percentual,
                    status
            ));
        }

        return listaStatus;
    }

    // -------------------------------------------------------------------------
    // PRIVADOS
    // -------------------------------------------------------------------------

    private BudgetStatusDTO calcularStatus(Budget budget, UUID userId, int month, int year) {
        BigDecimal gasto = budgetRepository.calcularGastoPorCategoria(
            userId,
            budget.getCategory().getId(),
            month,
            year
        );

        if (gasto == null) gasto = BigDecimal.ZERO;

        BigDecimal limite = budget.getAmountLimit();
        BigDecimal restante = limite.subtract(gasto);

        int percentual = 0;
        if (limite.compareTo(BigDecimal.ZERO) > 0) {
            percentual = gasto
                .divide(limite, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .intValue();
        }

        AlertStatus status;
        if (percentual >= 100) {
            status = AlertStatus.EXCEEDED;
        } else if (percentual >= budget.getAlertThreshold()) {
            status = AlertStatus.WARNING;
        } else {
            status = AlertStatus.OK;
        }

        return new BudgetStatusDTO(
            budget.getId(),
            budget.getCategory().getName(),
            limite,
            gasto,
            restante.max(BigDecimal.ZERO), // nunca retorna negativo no campo restante
            percentual,
            status
        );
    }

    private Budget buscarComValidacao(UUID budgetId, UUID userId) {
        Budget budget = budgetRepository.findById(budgetId)
            .orElseThrow(() -> new ObjectNotFoundException("Budget não encontrado"));

        // Data leakage: garante que o budget pertence ao usuário logado
        if (!budget.getOwner().getId().equals(userId)) {
            throw new RuntimeException("Você não tem permissão sobre este budget.");
        }

        return budget;
    }
}
