package com.marcosr_se.backend.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TaskTest {

    @Test
    void newTaskIsPending() {
        Task task = new Task("task-1", "Build the home page", Role.DEVELOPER);

        assertEquals(TaskStatus.PENDING, task.getStatus());
        assertNull(task.getAssigneeId());
        assertNull(task.getResult());
    }

    @Test
    void cannotStartUnassignedTask() {
        Task task = new Task("task-1", "Build the home page", Role.DEVELOPER);

        assertThrows(IllegalStateException.class, () -> task.start());
    }

    @Test
    void cannotCompletePendingTask() {
        Task task = new Task("task-1", "Build the home page", Role.DEVELOPER);

        assertThrows(IllegalStateException.class, () -> task.complete("index.html"));
    }

    @Test
    void assignToWrongRoleThrows() {
        Task task = new Task("task-1", "Build the home page", Role.DEVELOPER);
        Agent designer = new Agent("designer", "Diego", Role.DESIGNER);

        assertThrows(IllegalArgumentException.class, () -> task.assignTo(designer));
    }

    @Test
    void fullLifecycleEndsDone() {
        Task task = new Task("task-1", "Build the home page", Role.DEVELOPER);
        Agent dev = new Agent("dev", "Ana", Role.DEVELOPER);

        task.assignTo(dev);
        task.start();
        task.complete("index.html");

        assertEquals(TaskStatus.DONE, task.getStatus());
        assertEquals("dev", task.getAssigneeId());
        assertEquals("index.html", task.getResult());
    }
}
