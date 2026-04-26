package com.evely.financas.controller;

import java.time.LocalDate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.evely.financas.dto.DashboardDTO;
import com.evely.financas.model.User;
import com.evely.financas.service.DashboardService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    // Dashboard individual — mês/ano opcionais, padrão é o mês atual
    @GetMapping
    public ResponseEntity<DashboardDTO> getDashboard(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @AuthenticationPrincipal User user) {

        int m = month != null ? month : LocalDate.now().getMonthValue();
        int y = year != null ? year : LocalDate.now().getYear();

        return ResponseEntity.ok(dashboardService.getDashboard(user.getId(), m, y));
    }

    // Dashboard do casal
    @GetMapping("/casal")
    public ResponseEntity<DashboardDTO> getDashboardCasal(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @AuthenticationPrincipal User user) {

        int m = month != null ? month : LocalDate.now().getMonthValue();
        int y = year != null ? year : LocalDate.now().getYear();

        return ResponseEntity.ok(dashboardService.getDashboardCasal(user.getId(), m, y));
    }

    @GetMapping("/parceiro")
    public ResponseEntity<DashboardDTO> getDashboardParceiro(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @AuthenticationPrincipal User user) {

        int m = month != null ? month : LocalDate.now().getMonthValue();
        int y = year != null ? year : LocalDate.now().getYear();

        return ResponseEntity.ok(dashboardService.getDashboardParceiro(user.getId(), m, y));
    }
}
