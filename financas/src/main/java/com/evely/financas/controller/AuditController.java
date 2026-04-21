package com.evely.financas.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.evely.financas.model.AuditLog;
import com.evely.financas.model.User;
import com.evely.financas.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    /**
     * Histórico paginado das operações do usuário autenticado.
     * GET /api/audit?page=0&size=20
     */
    @GetMapping
    public ResponseEntity<Page<AuditLog>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(
            auditLogRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
        );
    }
}