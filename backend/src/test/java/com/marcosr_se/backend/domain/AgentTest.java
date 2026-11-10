package com.marcosr_se.backend.domain;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AgentTest {

    @Test
    void memoryKeepsOnlyLastFive() {
        Agent agent = new Agent("dev", "Ana", Role.DEVELOPER);

        for (int i = 1; i <= 6; i++) {
            agent.remember("fact " + i);
        }

        assertEquals(5, agent.getMemory().size());
        assertFalse(agent.getMemory().contains("fact 1"));
        assertEquals("fact 2", agent.getMemory().get(0));
    }

    @Test
    void getMemoryCannotBeModified() {
        Agent agent = new Agent("dev", "Ana", Role.DEVELOPER);

        assertThrows(UnsupportedOperationException.class, () -> agent.getMemory().add("x"));
    }

    @Test
    void receiveStoresMessageInMemory() {
        Agent agent = new Agent("dev", "Ana", Role.DEVELOPER);

        agent.receive(new Message("ceo", "dev", "Your task: Design the logo"));

        assertEquals(List.of("ceo said: Your task: Design the logo"), agent.getMemory());
    }
}
