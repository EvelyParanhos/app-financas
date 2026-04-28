package com.evely.financas.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.evely.financas.model.Category;
import com.evely.financas.model.User;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {

    @Override
    @Query("SELECT c FROM Category c WHERE c.active = true")
    List<Category> findAll();

    List<Category> findByOwnerAndActiveTrue(User owner);

    Optional<Category> findByIdAndActiveTrue(UUID id);

    /**
     * Versão por UUID — evita buscar o User inteiro só para listar categorias.
     * Usada em listarCasal quando o usuário não tem parceiro.
     */
    List<Category> findByOwnerIdAndActiveTrue(UUID ownerId);

    /**
     * Retorna as categorias ativas de dois usuários (eu + parceiro).
     * Usado no dashboard do casal para que ambos vejam as categorias um do outro
     * ao registrar transações em contas compartilhadas.
     */
    @Query("""
        SELECT c FROM Category c
        WHERE c.owner.id IN (:userId, :partnerId)
        AND c.active = true
        ORDER BY c.owner.id, c.name
    """)
    List<Category> findActivasByOwnerIds(
        @Param("userId") UUID userId,
        @Param("partnerId") UUID partnerId
    );
}
