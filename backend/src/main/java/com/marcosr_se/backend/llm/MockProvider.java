package com.marcosr_se.backend.llm;

import java.util.List;

public class MockProvider implements LLMProvider{
    private final List<String> responses;
    private int index;

    public MockProvider(List<String> responses){
        this.responses = List.copyOf(responses);
        this.index = 0;
    }

    @Override
    public String complete(String prompt){
        if (index>= responses.size()){
            throw new IllegalStateException("No more mock responses");
        }
        String response = responses.get(index);
        index++;
        return response;
    }

}
