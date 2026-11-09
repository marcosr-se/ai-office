package com.marcosr_se.backend.domain;

public record Message(String from, String to, String content) {
    public Message {
        if (from == null || from.isBlank()) throw new IllegalArgumentException("from cannot be empty");
        if (to == null || to.isBlank()) throw new IllegalArgumentException("to cannot be empty");
        if (content == null || content.isBlank()) throw new IllegalArgumentException("content cannot be empty");
    }
}
