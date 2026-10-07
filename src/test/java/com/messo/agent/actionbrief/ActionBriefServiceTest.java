package com.messo.agent.actionbrief;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.messo.agent.*;
import com.messo.agent.planner.AgentInvestigationResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ActionBriefServiceTest {

    private ObjectMapper objectMapper;
    private ActionBriefService actionBriefService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        actionBriefService = new ActionBriefService(objectMapper, "", "gemini-1.5-flash");
    }

    @Test
    void generateDeterministicBrief_preservesSemanticSeparationAndTraceability() {
        AgentRun run = new AgentRun();
        run.setGoalType(AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE);
        run.setGoalTarget("DINNER_SATISFACTION");
        run.setGoalDescription("Investigate why dinner satisfaction dropped");

        AgentInvestigationResult inv = new AgentInvestigationResult(
                1L,
                "INVESTIGATE_OPERATIONAL_ISSUE",
                "Investigate why dinner satisfaction dropped",
                List.of("Dinner ratings declined from 4.2 to 2.8"),
                List.of("15 complaints logged regarding food temperature and spice level"),
                List.of("Spice consistency in gravy dishes may be a contributing factor"),
                List.of("Root Cause Engine identified spice level anomaly (p < 0.05)"),
                "Summary explanation of collected findings",
                3,
                LocalDateTime.now().toString()
        );

        AgentStep step1 = new AgentStep();
        step1.setSequenceOrder(1);
        step1.setToolName("get_recent_ratings");

        AgentStep step2 = new AgentStep();
        step2.setSequenceOrder(2);
        step2.setToolName("get_complaints");

        AgentStep step3 = new AgentStep();
        step3.setSequenceOrder(3);
        step3.setToolName("run_root_cause");

        List<AgentStep> steps = List.of(step1, step2, step3);

        ActionBrief brief = actionBriefService.generateActionBrief(run, inv, steps);

        assertNotNull(brief);
        assertEquals("WAITING_FOR_APPROVAL", brief.status());

        // 1. Semantic separation check
        assertFalse(brief.observations().isEmpty());
        assertTrue(brief.observations().get(0).contains("Dinner ratings declined"));

        assertFalse(brief.evidence().isEmpty());
        assertTrue(brief.evidence().get(0).contains("complaints logged"));

        assertFalse(brief.possibleFactors().isEmpty());
        assertTrue(brief.possibleFactors().get(0).contains("Spice consistency"));

        assertFalse(brief.modelOutputs().isEmpty());
        assertTrue(brief.modelOutputs().get(0).contains("Root Cause Engine"));

        // 2. Proposed action check
        assertNotNull(brief.proposedAction());
        assertEquals(ProposedActionType.REVIEW_MENU_CHANGE, brief.proposedAction().type());
        assertNotNull(brief.proposedAction().description());

        // 3. Assumptions and limitations check
        assertFalse(brief.assumptions().isEmpty());
        assertFalse(brief.limitations().isEmpty());

        // 4. Source steps traceability check
        assertEquals(List.of(1, 2, 3), brief.sourceSteps());
    }

    @Test
    void actionBrief_serializesAndDeserializesCleanly() throws Exception {
        AgentRun run = new AgentRun();
        run.setGoalType(AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE);

        AgentInvestigationResult inv = new AgentInvestigationResult(
                2L, "INVESTIGATE_OPERATIONAL_ISSUE", "desc", List.of("obs"), List.of("ev"), List.of("pf"), List.of("mo"), "reason", 1, LocalDateTime.now().toString()
        );

        ActionBrief brief = actionBriefService.generateActionBrief(run, inv, List.of());
        String json = objectMapper.writeValueAsString(brief);

        assertNotNull(json);
        ActionBrief deserialized = objectMapper.readValue(json, ActionBrief.class);
        assertEquals(brief.title(), deserialized.title());
        assertEquals(brief.proposedAction().type(), deserialized.proposedAction().type());
        assertEquals("WAITING_FOR_APPROVAL", deserialized.status());
    }

    @Test
    void generateDeterministicBrief_whenMenuRepetitionGoal_generatesSpecificMenuRotationRecommendation() {
        AgentRun run = new AgentRun();
        run.setGoalType(AgentGoalType.MENU_REPETITION_AND_STUDENT_FATIGUE);
        run.setGoalTarget("MENU_ROTATION");
        run.setGoalDescription("Investigate whether frequent menu repetition is contributing to student dining fatigue");

        AgentInvestigationResult inv = new AgentInvestigationResult(
                10L,
                "MENU_REPETITION_AND_STUDENT_FATIGUE",
                run.getGoalDescription(),
                List.of("Student ratings show satisfaction variation across frequently served meal items."),
                List.of("Student complaints reflect recurring concerns regarding dish variety and menu rotation spacing."),
                List.of("High scheduling frequency of staple menu items may be contributing to student menu fatigue."),
                List.of("Root cause analysis identified Menu Repetition Fatigue (p < 0.05)."),
                "Synthesized menu repetition and fatigue evidence.",
                3,
                LocalDateTime.now().toString()
        );

        ActionBrief brief = actionBriefService.generateDeterministicBrief(run, inv, List.of(1, 2, 3));

        assertNotNull(brief);
        assertEquals("Review menu rotation", brief.title());
        assertEquals("Menu rotation", brief.proposedAction().suggestedTarget());
        assertEquals(ProposedActionType.REVIEW_MENU_CHANGE, brief.proposedAction().type());
        assertEquals("Review the current menu rotation and consider increasing variety for frequently repeated meal items.",
                brief.proposedAction().description());
        assertTrue(brief.rationale().toLowerCase().contains("repetition") || brief.rationale().toLowerCase().contains("fatigue"));
        assertTrue(brief.summary().toLowerCase().contains("menu repetition"));

        // Epistemic humility check: never claim correlation as causation
        assertFalse(brief.rationale().contains(" caused "));
        assertFalse(brief.rationale().contains(" is the reason"));
    }

    @Test
    void generateDeterministicBrief_whenDinnerSatisfactionGoal_generatesSpecificDinnerRecommendation() {
        AgentRun run = new AgentRun();
        run.setGoalType(AgentGoalType.INVESTIGATE_RATING_DROP);
        run.setGoalTarget("DINNER_SATISFACTION");
        run.setGoalDescription("Investigate why dinner satisfaction dropped this week");

        AgentInvestigationResult inv = new AgentInvestigationResult(
                11L,
                "INVESTIGATE_RATING_DROP",
                run.getGoalDescription(),
                List.of("Dinner ratings dropped from 3.8 to 3.1"),
                List.of("12 dinner complaints logged regarding food temperature"),
                List.of("Gravy consistency in evening meals may be a contributing factor"),
                List.of("Root cause analysis completed"),
                "Synthesized dinner ratings evidence.",
                3,
                LocalDateTime.now().toString()
        );

        ActionBrief brief = actionBriefService.generateDeterministicBrief(run, inv, List.of(1, 2, 3));

        assertNotNull(brief);
        assertEquals("Review dinner menu", brief.title());
        assertEquals("Dinner", brief.proposedAction().suggestedTarget());
        assertEquals("Review dinner meal options and preparation consistency with the kitchen team to address recent satisfaction decline.",
                brief.proposedAction().description());
        assertTrue(brief.rationale().toLowerCase().contains("dinner"));
    }
}
