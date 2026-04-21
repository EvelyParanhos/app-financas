package com.evely.financas.dto;

import java.util.UUID;
import com.evely.financas.enums.UserStatus;

public record UserResponseDTO(
    UUID id,
    String name,
    String email,
    String telegramId,
    UserStatus status,
    boolean hasPartner
) {}