package com.evely.financas.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.dto.AuthDTO;
import com.evely.financas.dto.TokenDTO;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.User;
import com.evely.financas.repository.UserRepository;
import com.evely.financas.service.JwtService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<TokenDTO> login(@RequestBody AuthDTO data) {
        User user = userRepository.findByEmail(data.email())
                .orElseThrow(() -> new ObjectNotFoundException("Usuário ou senha incorretos"));
        if (!passwordEncoder.matches(data.password(), user.getPassword())) {
            throw new ObjectNotFoundException("Usuário ou senha incorretos");
        }
        String token = jwtService.gerarToken(user);

        return ResponseEntity.ok(new TokenDTO(token));
    }
}