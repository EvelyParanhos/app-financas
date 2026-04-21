package com.evely.financas.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.model.User;
import com.evely.financas.service.EmailService;
import com.evely.financas.service.UserService;
import com.evely.financas.service.VerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final VerificationService verificationService;
    private final EmailService emailService;

    public record VerificationDTO(String email, String code) {}
    public record EditUserDTO(String name, String telegramId) {}

    // ✅ Público — cadastro de novo usuário
    @PostMapping
    public ResponseEntity<User> salvar(@Valid @RequestBody User user) {
        User novoUser = userService.salvar(user);
        String codigo = verificationService.solicitarNovoCodigo(novoUser.getId());
        emailService.enviarEmailVerificacao(novoUser.getEmail(), codigo);
        return ResponseEntity.status(201).body(novoUser);
    }

    // ✅ Público — verificação de conta
    @PostMapping("/verificar")
    public ResponseEntity<String> verificarConta(@RequestBody VerificationDTO data) {
        verificationService.validarCodigo(data.email(), data.code());
        return ResponseEntity.ok("Conta ativada com sucesso! Agora você pode usar o sistema.");
    }

    // ✅ Público — reenvio de código
    @PostMapping("/reenviar")
    public ResponseEntity<String> reenviarCodigo(@RequestBody VerificationDTO data) {
        User user = userService.buscarPorEmail(data.email());
        String codigo = verificationService.solicitarNovoCodigo(user.getId());
        emailService.enviarEmailVerificacao(data.email(), codigo);
        return ResponseEntity.ok("Novo código enviado! Verifique seu e-mail.");
    }

    // ✅ Autenticado — dados do próprio usuário
    @GetMapping("/me")
    public ResponseEntity<User> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(user);
    }

    // ✅ Autenticado — editar APENAS os próprios dados
    @PutMapping("/me")
    public ResponseEntity<User> editarProprioPerfil(
            @RequestBody EditUserDTO dto,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.editarPerfil(user.getId(), dto.name(), dto.telegramId()));
    }

    // ✅ Autenticado — excluir APENAS a própria conta
    @DeleteMapping("/me")
    public ResponseEntity<Void> excluirPropriaConta(@AuthenticationPrincipal User user) {
        userService.excluir(user.getId());
        return ResponseEntity.noContent().build();
    }

    // ❌ REMOVIDOS os endpoints GET /users (lista todos) e DELETE /{id} (qualquer id)
    // Esses endpoints expunham dados de todos os usuários sem nenhuma autorização.
    // Se precisar de acesso admin no futuro, implemente com role ADMIN + filtro de segurança.
}