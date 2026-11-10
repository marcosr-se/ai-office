package com.marcosr_se.backend.domain;

public class Task {
    private final String id;
    private final String title;
    private final Role role;
    private TaskStatus status;
    private String assigneeId;
    private String result;

    public Task(String id, String title, Role role) {
        if (title == null || title.isBlank()) throw new IllegalArgumentException("Title must exist");
        this.id = id;
        this.title = title;
        this.role = role;
        status = TaskStatus.PENDING;
    }

    public void assignTo(Agent agent) {
        if (status != TaskStatus.PENDING) throw new IllegalStateException("Task must be pending to be assigned");
        if (agent == null || agent.getRole() != role) throw new IllegalArgumentException("Agent's role is incorrect");
        assigneeId = agent.getId();
    }

    public void start() {
        if (status == TaskStatus.PENDING && assigneeId != null) {
            status = TaskStatus.IN_PROGRESS;
        } else throw new IllegalStateException("Task must be pending and assigned to start");
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public Role getRole() {
        return role;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public String getAssigneeId() {
        return assigneeId;
    }

    public String getResult() {
        return result;
    }

    public void complete(String result) {
        if (status == TaskStatus.IN_PROGRESS) {
            status = TaskStatus.DONE;
            this.result = result;
        } else throw new IllegalStateException("Cannot complete the task if it is not in progress");
    }

}
