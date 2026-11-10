package com.marcosr_se.backend.domain;

import java.util.*;

public class Office {
    private final Map<String, Agent> agents;
    private final List<Task> tasks;
    private final List<Message> messages;

    public Office() {
        agents = new LinkedHashMap<>();
        tasks = new ArrayList<>();
        messages = new ArrayList<>();
    }

    public void hire(Agent agent) {
        if (agents.containsKey(agent.getId())) {
            throw new IllegalArgumentException("ID in use");
        }
        agents.put(agent.getId(), agent);
    }

    public Optional<Agent> findAgent(String id) {
        return Optional.ofNullable(agents.get(id));
    }

    public Optional<Agent> findAgentByRole(Role role) {
        for (Agent agent : agents.values()) {
            if (agent.getRole() == role) {
                return Optional.of(agent);
            }
        }
        return Optional.empty();
    }

    public void addTask(Task task) {
        tasks.add(task);
    }

    public void send(Message message) {
        Agent recipient = agents.get(message.to());
        if (recipient == null) throw new IllegalArgumentException("Recipient does not exist: " + message.to());
        messages.add(message);
        recipient.receive(message);
    }

    public List<Agent> getAgents() {
        return List.copyOf(agents.values());
    }

    public List<Task> getTasks() {
        return List.copyOf(tasks);
    }

    public List<Message> getMessages() {
        return List.copyOf(messages);
    }
}
