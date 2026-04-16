package com.evely.financas.enums;

public enum AlertStatus {
    OK,       // abaixo do threshold
    WARNING,  // atingiu o threshold mas não estourou
    EXCEEDED  // ultrapassou o limite
}