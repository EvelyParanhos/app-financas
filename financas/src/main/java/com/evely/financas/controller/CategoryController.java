package com.evely.financas.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.model.Category;
import com.evely.financas.service.CategoryService;
import lombok.RequiredArgsConstructor;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {
    private final CategoryService categoryService;

    @PostMapping
    public ResponseEntity<String> salvar (@RequestBody Category category) {
        categoryService.registrarCategoria(category);
        return ResponseEntity.status(201).body("Categoria registrada com sucesso!");
    }

    @GetMapping
    public ResponseEntity<List<Category>> listar() {
        List<Category> lista = categoryService.listarTodas();
        return ResponseEntity.ok(lista);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        categoryService.excluir(id);
        return ResponseEntity.noContent().build(); 
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Category> editar(@PathVariable Integer id, @RequestBody Category category) {
        Category atualizada = categoryService.atualizar(id, category);
        return ResponseEntity.ok(atualizada);
    }
    
}
