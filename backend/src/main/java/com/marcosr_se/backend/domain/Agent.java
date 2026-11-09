package com.marcosr_se.backend.domain;

import java.util.ArrayList;
import java.util.List;

public class Agent {
    private final String id;
    private final String name;
    private final Role role;
    private Location location;
    private final List<String> memory;
    private static final int MAX_MEMORY = 5;

    public Agent(String id, String name, Role role) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.location = Location.DESK;
        memory = new ArrayList<>(MAX_MEMORY);
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Role getRole() {
        return role;
    }

    public Location getLocation() {
        return location;
    }

    public void moveTo(Location location) {
        this.location = location;
    }

    public void remember(String fact) {
        memory.add(fact);
        if (memory.size() > MAX_MEMORY) {
            memory.remove(0);
        }
    }

    public void receive(Message message) {
        remember(message.from() + " said: " + message.content());
    }

    public List<String> getMemory() {
        return List.copyOf(memory);
    }

    public String toString() {
        return name + "(" + role.getDisplayName() + ")";
    }

}
