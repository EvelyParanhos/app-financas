package com.evely.financas.exception;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StandardError {
    private LocalDateTime timestamp;
    private Integer status;
    private String error;
    private String message;
    private String path;
}