package com.marcosr_se.backend.llm;

public interface LLMProvider {
    String complete(String prompt);
}
