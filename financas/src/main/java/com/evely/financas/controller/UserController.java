package com.evely.financas.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.evely.financas.enums.UserStatus;
import com.evely.financas.model.User;
import com.evely.financas.service.EmailService;
import com.evely.financas.service.UserService;
import com.evely.financas.service.VerificationService;
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
    private final VerificationService verificationService;
    private final EmailService emailService;

    @PostMapping
    public ResponseEntity <User> salvar(@RequestBody User user) {  
        User novoUser = userService.salvar(user);
        String codigo = verificationService.solicitarNovoCodigo(user.getId());
        novoUser.setStatus(UserStatus.PENDING);
        emailService.enviarEmailVerificacao(user.getEmail(), codigo);
        return ResponseEntity.status(201).body(novoUser);

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

    @PostMapping("/verificar")
    public ResponseEntity <String> verificarConta (@RequestParam UUID id, @RequestParam String code) {
        verificationService.validarCodigo(id, code);
        return ResponseEntity.ok("Conta ativada com sucesso! Agora você pode usar o sistema.");
    }
}
