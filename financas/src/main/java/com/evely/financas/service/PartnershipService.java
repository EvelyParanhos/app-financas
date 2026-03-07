package com.evely.financas.service;

import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        //Gera um código aleatório de 6 caracteres que vai expirar em 24 horas desde da hora que foi gerado
        String codigo = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        
        user.setInviteCode(codigo);
        user.setInviteExpiry(LocalDateTime.now().plusHours(24)); 
        userRepository.save(user);
        
        return codigo;
    }

    @Transactional
    public void aceitarConvite(String codigo, UUID convidadoId) {
        User anfitriao = userRepository.findByInviteCode(codigo)
                .orElseThrow(() -> new RuntimeException("Código inválido ou inexistente"));

        if (anfitriao.getInviteExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Este código de convite já expirou!");
        }

        if (anfitriao.getId().equals(convidadoId)) {
            throw new RuntimeException("Você não pode conectar-se consigo mesmo, espertinho!");
        }

        Partnership parceria = new Partnership();
        parceria.setUserA(anfitriao);
        parceria.setUserB(userRepository.getReferenceById(convidadoId));
        partnershipRepository.save(parceria);

        //limpando o código pra não ser reaproveitado
        anfitriao.setInviteCode(null);
        anfitriao.setInviteExpiry(null);
        userRepository.save(anfitriao);
    }
}
