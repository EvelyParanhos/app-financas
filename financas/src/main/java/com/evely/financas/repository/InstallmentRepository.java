package com.evely.financas.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.evely.financas.enums.InstallmentStatus;
import com.evely.financas.model.Installment;

@Repository
public interface InstallmentRepository extends JpaRepository <Installment, Integer> {
       @Query("SELECT SUM(i.amount) FROM Installment i WHERE i.payer.id = :userId AND i.status = :status")
       BigDecimal somarTotalPorUsuarioEStatus(@Param("userId") Integer userId, @Param("status") InstallmentStatus status);

       @Query("SELECT SUM(i.amount) FROM Installment i WHERE i.payer.id = :userId " + "AND i.status = :status AND i.dueDate BETWEEN :inicio AND :fim")
       BigDecimal somarMensalPorUsuario(@Param("userId") Integer userId, @Param("status") InstallmentStatus status, @Param("inicio") LocalDate inicio, @Param("fim") LocalDate fim);

       @Query("SELECT SUM(i.amount) FROM Installment i " + "JOIN i.transaction t " + "WHERE i.payer.id = :userId " + "AND i.status = 'PENDING' " + "AND i.dueDate BETWEEN :inicio AND :fim " +"AND (:incluirSimulacoes = true OR t.isSimulation = false)")
       BigDecimal somarDividasComFiltro(@Param("userId") Integer userId, @Param("inicio") LocalDate inicio, @Param("fim") LocalDate fim, @Param("incluirSimulacoes") boolean incluirSimulacoes);
}

