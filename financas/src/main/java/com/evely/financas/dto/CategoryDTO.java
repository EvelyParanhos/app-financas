package com.evely.financas.dto;

import com.evely.financas.enums.CategoryType;

public record CategoryDTO(
    String name,
    CategoryType type,
    String icon,   // ex: "house", "utensils" — nome do ícone Lucide
    String color   // ex: "#6366F1"
) {}