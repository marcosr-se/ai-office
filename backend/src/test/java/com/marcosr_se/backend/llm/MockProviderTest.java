package com.marcosr_se.backend.llm;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MockProviderTest {

    @Test
    void returnsResponsesInOrder() {
        LLMProvider llm = new MockProvider(List.of("first", "second"));

        assertEquals("first", llm.complete("anything"));
        assertEquals("second", llm.complete("anything"));
    }

    @Test
    void throwsWhenNoMoreResponses() {
        LLMProvider llm = new MockProvider(List.of("only one"));
        llm.complete("anything");

        assertThrows(IllegalStateException.class, () -> llm.complete("anything"));
    }
}
