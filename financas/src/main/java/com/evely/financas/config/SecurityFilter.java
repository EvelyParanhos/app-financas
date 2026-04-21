package com.evely.financas.config;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.evely.financas.model.User;
import com.evely.financas.repository.UserRepository;
import com.evely.financas.service.JwtService;
import java.io.IOException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class SecurityFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String token = recuperarToken(request);

        if (token != null) {
            try {
                String email = jwtService.extrairEmail(token);

                // ✅ FIX: Optional.empty() → 401 limpo, sem lançar exceção dentro do Filter
                User user = userRepository.findByEmail(email).orElse(null);
                if (user == null) {
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Usuário não encontrado.");
                    return;
                }

                var authentication = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (Exception e) {
                // Token malformado, expirado ou assinatura inválida → 401 sem 500
                log.warn("Token JWT inválido: {}", e.getMessage());
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token inválido ou expirado.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String recuperarToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return authHeader.replace("Bearer ", "").trim();
    }
}