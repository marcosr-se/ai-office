package com.marcosr_se.backend.simulation;

import com.marcosr_se.backend.domain.Agent;
import com.marcosr_se.backend.domain.Office;
import com.marcosr_se.backend.domain.Role;
import com.marcosr_se.backend.llm.LLMProvider;
import com.marcosr_se.backend.llm.MockProvider;

import java.util.List;

public class ConsoleApp {

    public static void main(String[] args) {
        Office office = new Office();
        office.hire(new Agent("ceo", "Carla", Role.CEO));
        office.hire(new Agent("dev", "Ana", Role.DEVELOPER));
        office.hire(new Agent("designer", "Diego", Role.DESIGNER));
        office.hire(new Agent("tester", "Tomas", Role.TESTER));

        LLMProvider llm = new MockProvider(List.of(
                "DEVELOPER: Build the home page\n"
                        + "DESIGNER: Design the logo\n"
                        + "TESTER: Test the home page\n"
                        + "JANITOR: Clean the office",
                "index.html with a header and a menu",
                "logo.svg with a coffee cup",
                "Report: 0 bugs found"
        ));

        new Simulation(office, llm).run("Make a website for a coffee shop");
    }
}
