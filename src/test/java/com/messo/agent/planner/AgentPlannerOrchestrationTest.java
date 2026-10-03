package com.messo.agent.planner;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.messo.agent.*;
import com.messo.agent.planner.gemini.GeminiAgentPlannerEngine;
import com.messo.agent.tool.AgentToolExecutor;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgentPlannerOrchestrationTest {

    @Mock
    private AgentRunRepository runRepository;

    @Mock
    private AgentStepRepository stepRepository;

    @Mock
    private AgentToolExecutor toolExecutor;

    @Mock
    private AgentPlannerEngine mockPlannerEngine;

    private ObjectMapper objectMapper;
    private com.messo.agent.actionbrief.ActionBriefService actionBriefService;
    private AgentOrchestratorService orchestrator;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        actionBriefService = new com.messo.agent.actionbrief.ActionBriefService(objectMapper, "", "gemini-1.5-flash");
        orchestrator = new AgentOrchestratorService(
                runRepository,
                stepRepository,
                toolExecutor,
                mockPlannerEngine,
                objectMapper,
                actionBriefService
        );
    }

    // =========================================================================
    // 1. Planner receives investigation goal & sequences tools to WAITING_FOR_APPROVAL
    // =========================================================================
    @Test
    void investigationLoop_executesSequenceAndCompletesWithActionBrief() {
        AgentRun run = createTestRun(1L, AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "DINNER_SATISFACTION", "Investigate drop");
        when(runRepository.findById(1L)).thenReturn(Optional.of(run));
        when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

        // Step 1: Call get_recent_ratings
        PlannerDecision step1 = PlannerDecision.callTool(
                "get_recent_ratings",
                Map.of("limit", "50"),
                "Checking recent ratings first"
        );
        // Step 2: Call run_root_cause
        PlannerDecision step2 = PlannerDecision.callTool(
                "run_root_cause",
                Map.of("startDate", "2026-09-01", "endDate", "2026-09-30"),
                "Running root cause engine"
        );
        // Step 3: Complete
        PlannerDecision step3 = PlannerDecision.complete("Investigation finished with evidence.");

        when(mockPlannerEngine.planNextStep(any(PlannerContext.class)))
                .thenReturn(step1)
                .thenReturn(step2)
                .thenReturn(step3);

        ToolResult resRatings = ToolResult.success("get_recent_ratings", AgentToolType.READ_ONLY)
                .summary("Ratings average was 2.8")
                .build();
        ToolResult resWhy = ToolResult.success("run_root_cause", AgentToolType.READ_ONLY)
                .summary("Root cause identified dinner spice level")
                .build();

        when(toolExecutor.execute(eq("get_recent_ratings"), any(ToolInput.class))).thenReturn(resRatings);
        when(toolExecutor.execute(eq("run_root_cause"), any(ToolInput.class))).thenReturn(resWhy);

        AgentRun result = orchestrator.runInvestigation(1L);

        assertEquals(AgentRunStatus.WAITING_FOR_APPROVAL, result.getStatus());
        assertTrue(result.getApprovalRequired());
        assertNotNull(result.getFinalResult());
        assertTrue(result.getFinalResult().contains("Ratings average was 2.8"));
        assertTrue(result.getFinalResult().contains("Root cause identified dinner spice level"));

        assertNotNull(result.getActionBrief());
        assertTrue(result.getActionBrief().contains("REVIEW_MENU_CHANGE"));

        // Verify steps persisted
        verify(stepRepository, times(4)).save(any(AgentStep.class)); // 2 steps * (start + complete)
    }

    // =========================================================================
    // 2. Planner cannot execute unknown or unauthorized tools
    // =========================================================================
    @Test
    void planner_requestsUnknownTool_failsSafely() {
        AgentRun run = createTestRun(2L, AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "DINNER", "Test");
        when(runRepository.findById(2L)).thenReturn(Optional.of(run));
        when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

        PlannerDecision badDecision = PlannerDecision.callTool(
                "arbitrary_unknown_tool",
                Map.of(),
                "Trying unknown"
        );
        when(mockPlannerEngine.planNextStep(any())).thenReturn(badDecision);

        AgentRun result = orchestrator.runInvestigation(2L);

        assertEquals(AgentRunStatus.FAILED, result.getStatus());
        assertEquals("UNAUTHORIZED_TOOL", result.getFailureCode());
        verify(toolExecutor, never()).execute(anyString(), any());
    }

    // =========================================================================
    // 3. Planner cannot execute ACTION tools
    // =========================================================================
    @Test
    void planner_requestsActionTool_failsSafely() {
        AgentRun run = createTestRun(3L, AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "DINNER", "Test");
        when(runRepository.findById(3L)).thenReturn(Optional.of(run));
        when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

        PlannerDecision actionDecision = PlannerDecision.callTool(
                "send_notification",
                Map.of(),
                "Attempting to notify"
        );
        when(mockPlannerEngine.planNextStep(any())).thenReturn(actionDecision);

        AgentRun result = orchestrator.runInvestigation(3L);

        assertEquals(AgentRunStatus.FAILED, result.getStatus());
        assertEquals("UNAUTHORIZED_TOOL", result.getFailureCode());
        verify(toolExecutor, never()).execute(anyString(), any());
    }

    // =========================================================================
    // 4. Duplicate tool call protection prevents cyclic infinite loops
    // =========================================================================
    @Test
    void duplicateToolCall_terminatesGracefullyWithoutLooping() {
        AgentRun run = createTestRun(4L, AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "DINNER", "Test");
        when(runRepository.findById(4L)).thenReturn(Optional.of(run));
        when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

        PlannerDecision repeatCall = PlannerDecision.callTool(
                "get_recent_ratings",
                Map.of("limit", "10"),
                "Reading ratings again"
        );
        when(mockPlannerEngine.planNextStep(any())).thenReturn(repeatCall);

        ToolResult res = ToolResult.success("get_recent_ratings", AgentToolType.READ_ONLY)
                .summary("Average 3.1")
                .build();
        when(toolExecutor.execute(eq("get_recent_ratings"), any())).thenReturn(res);

        AgentRun result = orchestrator.runInvestigation(4L);

        assertEquals(AgentRunStatus.WAITING_FOR_APPROVAL, result.getStatus());
        assertTrue(result.getApprovalRequired());
        assertNotNull(result.getActionBrief());
        verify(toolExecutor, times(1)).execute(eq("get_recent_ratings"), any());
    }

    // =========================================================================
    // 5. Hard step limit triggers FAILED with STEP_LIMIT_EXCEEDED
    // =========================================================================
    @Test
    void stepLimit_reached_failsWithControlledReason() {
        orchestrator.setMaxSteps(3);

        AgentRun run = createTestRun(5L, AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "DINNER", "Test");
        when(runRepository.findById(5L)).thenReturn(Optional.of(run));
        when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

        // Planner always calls a different tool each step but never completes
        PlannerDecision step1 = PlannerDecision.callTool("get_recent_ratings", Map.of("p", "1"), "Step 1");
        PlannerDecision step2 = PlannerDecision.callTool("get_complaints", Map.of("p", "2"), "Step 2");
        PlannerDecision step3 = PlannerDecision.callTool("get_poll_results", Map.of("p", "3"), "Step 3");
        PlannerDecision step4 = PlannerDecision.callTool("get_menu_history", Map.of("p", "4"), "Step 4");

        when(mockPlannerEngine.planNextStep(any()))
                .thenReturn(step1)
                .thenReturn(step2)
                .thenReturn(step3)
                .thenReturn(step4);

        when(toolExecutor.execute(anyString(), any()))
                .thenReturn(ToolResult.success("tool", AgentToolType.READ_ONLY).summary("OK").build());

        AgentRun result = orchestrator.runInvestigation(5L);

        assertEquals(AgentRunStatus.FAILED, result.getStatus());
        assertEquals("STEP_LIMIT_EXCEEDED", result.getFailureCode());
        assertTrue(result.getFailureReason().contains("step limit reached"));
    }

    // =========================================================================
    // 6. Gemini Deterministic Fallback Engine Test
    // =========================================================================
    @Test
    void geminiEngine_whenApiKeyBlank_usesDeterministicSequence() {
        GeminiAgentPlannerEngine engine = new GeminiAgentPlannerEngine("", "gemini-1.5-flash", objectMapper);
        assertFalse(engine.isConfigured());

        PlannerContext ctx0 = new PlannerContext(1L, "INVESTIGATE_OPERATIONAL_ISSUE", "DINNER", "desc", List.of(), List.of());
        PlannerDecision d1 = engine.planNextStep(ctx0);

        assertEquals("get_recent_ratings", d1.toolName());

        PlannerContext ctx1 = new PlannerContext(1L, "INVESTIGATE_OPERATIONAL_ISSUE", "DINNER", "desc", List.of(), List.of(
                new PlannerContext.StepRecord(1, "get_recent_ratings", Map.of(), true, "Ratings ok", "")
        ));
        PlannerDecision d2 = engine.planNextStep(ctx1);
        assertEquals("get_complaints", d2.toolName());

        PlannerContext ctx2 = new PlannerContext(1L, "INVESTIGATE_OPERATIONAL_ISSUE", "DINNER", "desc", List.of(), List.of(
                new PlannerContext.StepRecord(1, "get_recent_ratings", Map.of(), true, "Ratings ok", ""),
                new PlannerContext.StepRecord(2, "get_complaints", Map.of(), true, "Complaints ok", "")
        ));
        PlannerDecision d3 = engine.planNextStep(ctx2);
        assertEquals("run_root_cause", d3.toolName());

        PlannerContext ctx3 = new PlannerContext(1L, "INVESTIGATE_OPERATIONAL_ISSUE", "DINNER", "desc", List.of(), List.of(
                new PlannerContext.StepRecord(1, "get_recent_ratings", Map.of(), true, "Ratings ok", ""),
                new PlannerContext.StepRecord(2, "get_complaints", Map.of(), true, "Complaints ok", ""),
                new PlannerContext.StepRecord(3, "run_root_cause", Map.of(), true, "Root cause ok", "")
        ));
        PlannerDecision d4 = engine.planNextStep(ctx3);
        assertEquals(PlannerDecisionType.COMPLETE, d4.decisionType());
    }

    private AgentRun createTestRun(Long id, AgentGoalType goalType, String target, String desc) {
        AgentRun run = new AgentRun();
        try {
            var f = AgentRun.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(run, id);
            var fCreated = AgentRun.class.getDeclaredField("createdAt");
            fCreated.setAccessible(true);
            fCreated.set(run, LocalDateTime.now());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        run.setGoalType(goalType);
        run.setGoalTarget(target);
        run.setGoalDescription(desc);
        run.setTriggerType(AgentTriggerType.MANUAL);
        run.setStatus(AgentRunStatus.PENDING);
        run.setInitiatedBy("admin@test.com");
        return run;
    }
}
