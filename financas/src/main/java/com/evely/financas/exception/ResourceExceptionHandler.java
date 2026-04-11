package com.evely.financas.exception;

import java.time.LocalDateTime;
import org.hibernate.ObjectNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import jakarta.servlet.http.HttpServletRequest;

@ControllerAdvice
public class ResourceExceptionHandler {

    @ExceptionHandler(ObjectNotFoundException.class)
    public ResponseEntity<StandardError> objectNotFound(ObjectNotFoundException e, HttpServletRequest request) {
        StandardError err = new StandardError(
            LocalDateTime.now(), 
            HttpStatus.NOT_FOUND.value(), 
            "Não encontrado", 
            e.getMessage(), 
            request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<StandardError> handleRuntimeException(RuntimeException e, HttpServletRequest request) {
        StandardError err = new StandardError(
            LocalDateTime.now(), 
            HttpStatus.BAD_REQUEST.value(), 
            "Erro de Regra de Negócio", 
            e.getMessage(), 
            request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }
}