package com.evely.financas.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.evely.financas.model.Category;
import com.evely.financas.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categoryRepository;

    public void registrarCategoria (Category category) {
        Category categoriaSalva = categoryRepository.save(category);
    }

    public List<Category> listarTodas() {
        return categoryRepository.findAll();
    }

    public void excluir(Integer id) {
        categoryRepository.deleteById(id);
    }
    
    public Category atualizar(Integer id, Category categoriaAtualizada) {
        Category categoriaExistente = categoryRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Categoria não encontrada com o ID: " + id));

        categoriaExistente.setName(categoriaAtualizada.getName());
        categoriaExistente.setType(categoriaAtualizada.getType());

        return categoryRepository.save(categoriaExistente);
    }
        
}
