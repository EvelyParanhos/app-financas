package com.evely.financas.service;

import org.springframework.security.access.AccessDeniedException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.evely.financas.dto.CategoryDTO;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Category;
import com.evely.financas.model.User;
import com.evely.financas.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public Category create(CategoryDTO dto, User owner) {
        Category category = new Category();
        category.setName(dto.name());
        category.setType(dto.type());
        category.setOwner(owner); 
        category.setActive(true);
        return categoryRepository.save(category);
    }

    public List<Category> listarMinhas(User owner) {
        return categoryRepository.findByOwnerAndActiveTrue(owner);
    }

    public void softDelete(UUID categoryId, User currentUser) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ObjectNotFoundException("Categoria não encontrada"));
        validarDono(category, currentUser);
        category.setActive(false);
        categoryRepository.save(category);
    }
    
    public Category atualizar(UUID id, CategoryDTO dto, User currentUser) {
        Category categoriaExistente = categoryRepository.findById(id)
            .orElseThrow(() -> new ObjectNotFoundException("Categoria não encontrada"));
        validarDono(categoriaExistente, currentUser);
        categoriaExistente.setName(dto.name());
        categoriaExistente.setType(dto.type());

        return categoryRepository.save(categoriaExistente);
    }

    private void validarDono(Category category, User user) {
        if (!category.getOwner().getId().equals(user.getId())) {
            throw new AccessDeniedException("Você não tem permissão para mexer nesta categoria");
        }
    }
}