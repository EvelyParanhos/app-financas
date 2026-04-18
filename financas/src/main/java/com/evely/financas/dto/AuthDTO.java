package com.evely.financas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AuthDTO(String email, @NotBlank(message = "A senha é obrigatória")
@Size(min = 8, message = "A senha deve ter no mínimo 8 caracteres")
@Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$", 
         message = "A senha deve conter letras, números e caracteres especiais")String password) {}