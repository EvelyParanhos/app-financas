package com.evely.financas.controller;

import org.springframework.web.bind.annotation.*;
import com.evely.financas.dto.CategoryDTO;
import com.evely.financas.model.Category;
import com.evely.financas.model.User;
import com.evely.financas.service.CategoryService;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    public ResponseEntity<Category> create(
            @RequestBody CategoryDTO dto,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(categoryService.create(dto, user));
    }

    /** Categorias do próprio usuário. */
    @GetMapping
    public ResponseEntity<List<Category>> listar(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(categoryService.listarMinhas(user));
    }

    /**
     * Categorias do casal (eu + parceiro).
     *
     * Use este endpoint no formulário de cadastro de transação em contas compartilhadas,
     * para que ambos possam usar as categorias um do outro sem precisar recriá-las.
     *
     * Se o usuário não tiver parceiro, retorna apenas as suas próprias.
     *
     * GET /api/categories/casal
     */
    @GetMapping("/casal")
    public ResponseEntity<List<Category>> listarCasal(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(categoryService.listarCasal(user.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        categoryService.softDelete(id, user);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Category> editar(
            @PathVariable UUID id,
            @RequestBody CategoryDTO dto,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(categoryService.atualizar(id, dto, user));
    }
}