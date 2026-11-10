package com.marcosr_se.backend.domain;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OfficeTest {

    @Test
    void hireDuplicateIdThrows() {
        Office office = new Office();
        office.hire(new Agent("dev", "Ana", Role.DEVELOPER));

        assertThrows(IllegalArgumentException.class,
                () -> office.hire(new Agent("dev", "Otro", Role.DEVELOPER)));
    }

    @Test
    void sendDeliversToRecipientMemory() {
        Office office = new Office();
        Agent ceo = new Agent("ceo", "Carla", Role.CEO);
        Agent dev = new Agent("dev", "Ana", Role.DEVELOPER);
        office.hire(ceo);
        office.hire(dev);

        office.send(new Message("ceo", "dev", "Your task: Build the home page"));

        assertEquals(List.of("ceo said: Your task: Build the home page"), dev.getMemory());
        assertEquals(1, office.getMessages().size());
    }

    @Test
    void findAgentByRoleIsEmptyWhenMissing() {
        Office office = new Office();
        office.hire(new Agent("ceo", "Carla", Role.CEO));

        assertTrue(office.findAgentByRole(Role.TESTER).isEmpty());
    }
}
