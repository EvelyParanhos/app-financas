package com.evely.financas.model;

import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.evely.financas.enums.CategoryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "categories")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User owner;

    private boolean active = true;

    private String name;

    @Enumerated(EnumType.STRING)
    private CategoryType type;

    /**
     * Nome do ícone Lucide (ex: "house", "utensils", "car").
     * ddl-auto=update adiciona a coluna automaticamente.
     */
    @Column(name = "icon")
    private String icon;

    /**
     * Cor hex da categoria (ex: "#6366F1").
     * ddl-auto=update adiciona a coluna automaticamente.
     */
    @Column(name = "color")
    private String color;
}