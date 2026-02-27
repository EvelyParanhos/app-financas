package com.evely.financas.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.evely.financas.dto.DashboardDTO;
import com.evely.financas.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;


@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboardService;

    @GetMapping("/individual/{userId}")
    public ResponseEntity <DashboardDTO> getResumo(@PathVariable Integer id) {
        return ResponseEntity.ok(dashboardService.getResumoIndividual(id));
    }
    
    @GetMapping("/casal")
    public ResponseEntity <DashboardDTO> getResumoCasal(@RequestParam Integer id1, @RequestParam Integer id2) {
        return ResponseEntity.ok(dashboardService.getResumoCasal(id1, id2));
    }
}
