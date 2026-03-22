package com.evely.financas.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void enviarEmailVerificacao(String para, String codigo) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("sistema@financas.com");
        message.setTo(para);
        message.setSubject("Seu Código de Verificação - Finanças em Casal");
        message.setText("Olá! Seu código de verificação é: " + codigo + 
                        "\nEle expira em 2 minutos. Não compartilhe com ninguém!");

        mailSender.send(message);
    }
}