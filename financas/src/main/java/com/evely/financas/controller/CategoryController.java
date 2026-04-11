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
    public ResponseEntity<Category> create(@RequestBody CategoryDTO dto, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(categoryService.create(dto, user));
    }

    @GetMapping
    public ResponseEntity<List<Category>> listar(@AuthenticationPrincipal User user) {
        List<Category> lista = categoryService.listarMinhas(user);
        return ResponseEntity.ok(lista);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        categoryService.softDelete(id, user);
        return ResponseEntity.noContent().build(); 
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Category> editar(@PathVariable UUID id, @RequestBody CategoryDTO dto, @AuthenticationPrincipal User user) {
        Category atualizada = categoryService.atualizar(id, dto, user);
        return ResponseEntity.ok(atualizada);
    }
}