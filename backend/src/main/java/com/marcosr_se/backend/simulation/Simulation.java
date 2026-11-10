package com.marcosr_se.backend.simulation;

import com.marcosr_se.backend.domain.Agent;
import com.marcosr_se.backend.domain.Location;
import com.marcosr_se.backend.domain.Message;
import com.marcosr_se.backend.domain.Office;
import com.marcosr_se.backend.domain.Role;
import com.marcosr_se.backend.domain.Task;
import com.marcosr_se.backend.llm.LLMProvider;

import java.util.Optional;

public class Simulation {
    private final Office office;
    private final LLMProvider llm;

    public Simulation(Office office, LLMProvider llm) {
        this.office = office;
        this.llm = llm;
    }

    public void run(String order) {
        Agent ceo = receiveOrder(order);
        String plan = llm.complete("Split this order into tasks: " + order);
        createTasks(plan);
        for (Task task : office.getTasks()) {
            doTask(ceo, task);
        }
        holdMeeting();
        printSummary();
    }

    private Agent receiveOrder(String order) {
        Optional<Agent> result = office.findAgentByRole(Role.CEO);
        if (result.isEmpty()) {
            throw new IllegalStateException("The office has no CEO");
        }
        Agent ceo = result.get();
        System.out.println("[Client] -> " + ceo + ": " + order);
        ceo.remember("Client ordered: " + order);
        return ceo;
    }

    private void createTasks(String plan) {
        String[] lines = plan.split("\n");
        for (String line : lines) {
            String[] parts = line.split(":", 2);
            if (parts.length < 2) {
                System.out.println("[Warning] Skipped line without ':': " + line);
                continue;
            }
            try {
                Role role = Role.valueOf(parts[0].trim());
                String title = parts[1].trim();
                String id = "task-" + (office.getTasks().size() + 1);
                office.addTask(new Task(id, title, role));
            } catch (IllegalArgumentException e) {
                System.out.println("[Warning] Skipped invalid line: " + line);
            }
        }
    }

    private void doTask(Agent ceo, Task task) {
        Optional<Agent> result = office.findAgentByRole(task.getRole());
        if (result.isEmpty()) {
            System.out.println("[Warning] Nobody can do: " + task.getTitle());
            return;
        }
        Agent agent = result.get();
        task.assignTo(agent);
        send(ceo, agent, "Your task: " + task.getTitle());
        agent.moveTo(Location.DESK);
        task.start();
        String output = llm.complete("Do this task: " + task.getTitle());
        task.complete(output);
        send(agent, ceo, "Done: " + task.getTitle());
    }

    private void send(Agent from, Agent to, String content) {
        office.send(new Message(from.getId(), to.getId(), content));
        System.out.println("[" + from + "] -> " + to + ": " + content);
    }

    private void holdMeeting() {
        System.out.println("[Office] Everyone goes to the meeting room");
        for (Agent agent : office.getAgents()) {
            agent.moveTo(Location.MEETING_ROOM);
        }
    }

    private void printSummary() {
        System.out.println();
        System.out.println("=== Tasks ===");
        for (Task task : office.getTasks()) {
            System.out.println(task.getId() + " | " + task.getStatus() + " | " + task.getAssigneeId()
                    + " | " + task.getTitle() + " -> " + task.getResult());
        }
        System.out.println();
        System.out.println("=== Memory ===");
        for (Agent agent : office.getAgents()) {
            System.out.println(agent + ":");
            for (String fact : agent.getMemory()) {
                System.out.println("  - " + fact);
            }
        }
    }
}
