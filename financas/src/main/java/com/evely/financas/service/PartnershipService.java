package com.evely.financas.service;

import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.evely.financas.exception.ObjectNotFoundException;
import com.evely.financas.model.Partnership;
import com.evely.financas.model.User;
import com.evely.financas.repository.PartnershipRepository;
import com.evely.financas.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PartnershipService {

    private final UserRepository userRepository;
    private final PartnershipRepository partnershipRepository;

    public String gerarCodigoConvite(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado"));

        if (partnershipRepository.findByUserId(userId).isPresent()) {
            throw new RuntimeException("Você já possui uma parceria ativa.");
        }

        String codigo = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        user.setInviteCode(codigo);
        user.setInviteExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        return codigo;
    }

    @Transactional
    public void aceitarConvite(String codigo, UUID convidadoId) {
        User userA = userRepository.findByInviteCode(codigo)
            .orElseThrow(() -> new ObjectNotFoundException("Código de convite inválido ou expirado."));

        User userB = userRepository.findById(convidadoId)
            .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado."));

        if (userA.getId().equals(userB.getId())) {
            throw new RuntimeException("Você não pode criar uma parceria consigo mesmo.");
        }

        if (userA.getInviteExpiry() == null || userA.getInviteExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Este código de convite expirou. Peça um novo.");
        }

        if (partnershipRepository.findByUserId(userA.getId()).isPresent()) {
            throw new RuntimeException("O usuário que enviou o convite já possui uma parceria ativa.");
        }
        if (partnershipRepository.findByUserId(userB.getId()).isPresent()) {
            throw new RuntimeException("Você já possui uma parceria ativa.");
        }

        Partnership partnership = new Partnership();
        partnership.setUserA(userA);
        partnership.setUserB(userB);
        partnershipRepository.save(partnership);

        userA.setInviteCode(null);
        userA.setInviteExpiry(null);
        userRepository.save(userA);
    }

    /**
     * ✅ ITEM 9: Dissolve a parceria ativa do usuário.
     *
     * ⚠️ EFEITO COLATERAL IMPORTANTE:
     * Após a dissolução, contas compartilhadas permanecem existindo no banco —
     * apenas o parceiro perde acesso a elas via API.
     * Transações e parcelas existentes com pagador do ex-parceiro também permanecem.
     * Não há cascade automático para preservar o histórico financeiro.
     */
    @Transactional
    public void dissolverParceria(UUID userId) {
        Partnership partnership = partnershipRepository.findByUserId(userId)
            .orElseThrow(() -> new RuntimeException("Você não possui uma parceria ativa."));
        partnershipRepository.delete(partnership);
    }
}