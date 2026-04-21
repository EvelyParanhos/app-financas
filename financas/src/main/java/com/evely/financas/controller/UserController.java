package com.evely.financas.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.evely.financas.dto.CadastroDTO;
import com.evely.financas.dto.UserResponseDTO;
import com.evely.financas.model.User;
import com.evely.financas.repository.PartnershipRepository;
import com.evely.financas.service.EmailService;
import com.evely.financas.service.UserService;
import com.evely.financas.service.VerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final VerificationService verificationService;
    private final EmailService emailService;
    private final PartnershipRepository partnershipRepository;

    public record VerificationDTO(String email, String code) {}
    public record EditUserDTO(String name, String telegramId) {}

    // ✅ Público — cadastro recebe CadastroDTO, nunca a entidade User
    @PostMapping
    public ResponseEntity<UserResponseDTO> salvar(@Valid @RequestBody CadastroDTO dto) {
        User novoUser = userService.salvar(dto);
        String codigo = verificationService.solicitarNovoCodigo(novoUser.getId());
        emailService.enviarEmailVerificacao(novoUser.getEmail(), codigo);
        return ResponseEntity.status(201).body(toResponseDTO(novoUser, false));
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

    // ✅ Autenticado — retorna UserResponseDTO (sem campos sensíveis)
    @GetMapping("/me")
    public ResponseEntity<UserResponseDTO> me(@AuthenticationPrincipal User user) {
        boolean hasPartner = partnershipRepository.findByUserId(user.getId()).isPresent();
        return ResponseEntity.ok(toResponseDTO(user, hasPartner));
    }

    // ✅ Autenticado — editar apenas os próprios dados
    @PutMapping("/me")
    public ResponseEntity<UserResponseDTO> editarProprioPerfil(
            @RequestBody EditUserDTO dto,
            @AuthenticationPrincipal User user) {
        User atualizado = userService.editarPerfil(user.getId(), dto.name(), dto.telegramId());
        boolean hasPartner = partnershipRepository.findByUserId(atualizado.getId()).isPresent();
        return ResponseEntity.ok(toResponseDTO(atualizado, hasPartner));
    }

    // ✅ Autenticado — excluir apenas a própria conta
    @DeleteMapping("/me")
    public ResponseEntity<Void> excluirPropriaConta(@AuthenticationPrincipal User user) {
        userService.excluir(user.getId());
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------
    // HELPER PRIVADO
    // -------------------------------------------------------------------------

    private UserResponseDTO toResponseDTO(User user, boolean hasPartner) {
        return new UserResponseDTO(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getTelegramId(),
            user.getStatus(),
            hasPartner
        );
    }
}