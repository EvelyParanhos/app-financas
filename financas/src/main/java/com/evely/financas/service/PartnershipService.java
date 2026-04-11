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

        //Gera um código aleatório de 6 caracteres que vai expirar em 24 horas desde da hora que foi gerado
        String codigo = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        
        user.setInviteCode(codigo);
        user.setInviteExpiry(LocalDateTime.now().plusHours(24)); 
        userRepository.save(user);
        
        return codigo;
    }

    @Transactional
    public void aceitarConvite(String codigo, UUID convidadoId) {
            // Busca quem enviou o convite
        User userA = userRepository.findByInviteCode(codigo)
                .orElseThrow(() -> new ObjectNotFoundException("Código de convite inválido ou expirado."));

        // Busca quem está aceitando
        User userB = userRepository.findById(convidadoId)
                .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado."));

        // Cria a parceria (O ID será gerado pelo @GeneratedValue da Entity)
        Partnership partnership = new Partnership();
        partnership.setUserA(userA);
        partnership.setUserB(userB);

        partnershipRepository.save(partnership);

        // Limpa o código para não ser usado de novo
        userA.setInviteCode(null);
        userRepository.save(userA);
    }
}
