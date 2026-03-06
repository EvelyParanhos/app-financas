package com.evely.financas.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.model.User;
import com.evely.financas.service.UserService;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;


@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @PostMapping
    public ResponseEntity <User> salvar(@RequestBody User user) {
        return ResponseEntity.status(201).body(userService.salvar(user));
    }

    @GetMapping
    public ResponseEntity<List<User>> listarTodos () {
        return ResponseEntity.ok(userService.listarTodos());
    }

    @DeleteMapping ("/{id}")
    public ResponseEntity<Void> excluir (@PathVariable UUID id) {
        userService.excluir(id);
        return ResponseEntity.noContent().build();
    }
    
    @PutMapping("/{id}")
    public ResponseEntity <User> editar(@PathVariable UUID id, @RequestBody User user) {
        return ResponseEntity.ok(userService.editar(id, user));
    }
}
