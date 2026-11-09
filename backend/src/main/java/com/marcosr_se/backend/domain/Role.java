package com.marcosr_se.backend.domain;

public enum Role {
    CEO("CEO"),
    DEVELOPER("Developer"),
    DESIGNER("Designer"),
    TESTER("Tester");

    private final String displayName;

    Role(String displayName){
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

