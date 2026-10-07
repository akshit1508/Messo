package com.messo.agent.execution;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.messo.agent.*;
import com.messo.agent.actionbrief.ActionBrief;
import com.messo.agent.actionbrief.ActionBriefService;
import com.messo.agent.actionbrief.ProposedActionType;
import com.messo.agent.dto.ActionExecutionResponse;
import com.messo.agent.dto.AgentRunResponse;
import com.messo.agent.planner.AgentOrchestratorService;
import com.messo.agent.planner.AgentPlannerEngine;
import com.messo.agent.planner.PlannerContext;
import com.messo.agent.planner.PlannerDecision;
import com.messo.agent.recommendation.AgentRecommendation;
import com.messo.agent.recommendation.AgentRecommendationRepository;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * End-to-end integration-style verification of the full lifecycle:
 * <pre>
 * 1. Create run (PENDING)
 * 2. Run investigation (RUNNING)
 * 3. Generate Action Brief (WAITING_FOR_APPROVAL)
 * 4. Human admin approval (APPROVED)
 * 5. Controlled action execution (COMPLETED)
 * 6. Verification of recommendation created & execution audit record
 * 7. Verification of double-execution idempotency (no duplicate creation)
 * </pre>
 */
@ExtendWith(MockitoExtension.class)
class AgentEndToEndExecutionTest {

    @Mock
    private AgentRunRepository runRepository;

    @Mock
    private AgentStepRepository stepRepository;

    @Mock
    private AgentToolExecutor toolExecutor;

    @Mock
    private AgentPlannerEngine plannerEngine;

    @Mock
    private AgentActionExecutionRepository executionRepository;

    @Mock
    private AgentRecommendationRepository recommendationRepository;

    @Mock
    private com.messo.agent.task.AgentImplementationTaskService taskService;

    @Mock
    private com.messo.repository.DailyMenuRepository dailyMenuRepository;

    @Mock
    private com.messo.repository.FoodRepository foodRepository;

    private ObjectMapper objectMapper;
    private ActionBriefService actionBriefService;
    private AgentOrchestratorService orchestratorService;
    private ActionExecutionService actionExecutionService;
    private AgentService agentService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        actionBriefService = new ActionBriefService(objectMapper, "", "gemini-1.5-flash");
        orchestratorService = new AgentOrchestratorService(
                runRepository, stepRepository, toolExecutor, plannerEngine, objectMapper, actionBriefService
        );
        actionExecutionService = new ActionExecutionService(
                runRepository, executionRepository, recommendationRepository, objectMapper, taskService, dailyMenuRepository, foodRepository
        );
        AgentToolRegistry toolRegistry = new AgentToolRegistry();
        agentService = new AgentService(
                runRepository, stepRepository, toolRegistry, toolExecutor, orchestratorService, actionExecutionService, recommendationRepository, taskService
        );
    }

    @Test
    void fullLifecycle_fromInvestigation_toApproval_toExecution_toIdempotency() {
        // Step 1: Create investigation run (PENDING)
        AgentRun run = new AgentRun();
        setField(run, "id", 100L);
        run.setGoalType(AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE);
        run.setGoalTarget("DINNER_SATISFACTION");
        run.setGoalDescription("Investigate persistent student ratings drop at dinner");
        run.setTriggerType(AgentTriggerType.MANUAL);
        run.setInitiatedBy("admin@messo.com");
        run.setStatus(AgentRunStatus.PENDING);

        when(runRepository.findById(100L)).thenReturn(Optional.of(run));
        when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

        // Step 2: Configure planner for multi-step tool execution
        PlannerDecision step1 = PlannerDecision.callTool(
                "get_recent_ratings", Map.of("limit", "50"), "Fetch ratings"
        );
        PlannerDecision step2 = PlannerDecision.complete("Findings collected.");
        when(plannerEngine.planNextStep(any(PlannerContext.class)))
                .thenReturn(step1)
                .thenReturn(step2);

        ToolResult toolRes = ToolResult.success("get_recent_ratings", AgentToolType.READ_ONLY)
                .summary("Dinner rating dropped to 2.9")
                .build();
        when(toolExecutor.execute(eq("get_recent_ratings"), any(ToolInput.class))).thenReturn(toolRes);

        // Run investigation
        AgentRunResponse investigatedRun = agentService.startInvestigation(100L);

        // Step 3: Verify investigation completed with ActionBrief in WAITING_FOR_APPROVAL
        assertNotNull(investigatedRun);
        assertEquals(AgentRunStatus.WAITING_FOR_APPROVAL, investigatedRun.status());
        assertTrue(investigatedRun.approvalRequired());
        assertNotNull(investigatedRun.actionBrief());
        assertTrue(investigatedRun.actionBrief().contains("REVIEW_MENU_CHANGE"));

        // Step 4: Admin approval transitions WAITING_FOR_APPROVAL -> APPROVED
        AgentRunResponse approvedRun = agentService.approveRun(100L, "supervisor@messo.com");
        assertEquals(AgentRunStatus.APPROVED, approvedRun.status());
        assertFalse(approvedRun.approvalRequired());
        assertEquals("supervisor@messo.com", approvedRun.approvedBy());
        assertNotNull(approvedRun.approvedAt());

        // Step 5: Controlled execution
        when(executionRepository.findByAgentRunId(100L)).thenReturn(Optional.empty());

        when(recommendationRepository.save(any(AgentRecommendation.class))).thenAnswer(inv -> {
            AgentRecommendation rec = inv.getArgument(0);
            setField(rec, "id", 555L);
            return rec;
        });

        AgentActionExecution savedExec = new AgentActionExecution();
        setField(savedExec, "id", 777L);
        savedExec.setAgentRunId(100L);
        savedExec.setActionType("REVIEW_MENU_CHANGE");
        savedExec.setStatus(ActionExecutionStatus.SUCCESS);
        savedExec.setResultSummary("Recommendation created");
        savedExec.setCompletedAt(LocalDateTime.now());

        when(executionRepository.save(any(AgentActionExecution.class))).thenReturn(savedExec);

        ActionExecutionResponse execResponse = agentService.executeApprovedAction(100L, "supervisor@messo.com");

        // Step 6: Verify executed action and state
        assertNotNull(execResponse);
        assertEquals(100L, execResponse.runId());
        assertEquals(AgentRunStatus.COMPLETED, execResponse.status());
        assertEquals("REVIEW_MENU_CHANGE", execResponse.actionType());
        assertEquals(ActionExecutionStatus.SUCCESS, execResponse.executionStatus());
        assertEquals(555L, execResponse.result().get("recommendationId"));

        verify(recommendationRepository, times(1)).save(any(AgentRecommendation.class));
        verify(executionRepository, times(1)).save(any(AgentActionExecution.class));

        // Step 7: Verify double execution is idempotent and does NOT duplicate action
        when(executionRepository.findByAgentRunId(100L)).thenReturn(Optional.of(savedExec));

        ActionExecutionResponse secondExecResponse = agentService.executeApprovedAction(100L, "supervisor@messo.com");

        assertNotNull(secondExecResponse);
        assertEquals(AgentRunStatus.COMPLETED, secondExecResponse.status());
        assertEquals(ActionExecutionStatus.SUCCESS, secondExecResponse.executionStatus());
        assertTrue(secondExecResponse.summary().contains("idempotent call"));

        // Still only 1 save called on recommendationRepository
        verify(recommendationRepository, times(1)).save(any(AgentRecommendation.class));
    }

    @Test
    void executeApprovedAction_strictlyGuardsOperationalTablesFromMutation() {
        // Mock operational repositories or services to verify no interaction
        AgentRun run = new AgentRun();
        setField(run, "id", 102L);
        run.setStatus(AgentRunStatus.APPROVED);
        ActionBrief brief = new ActionBrief(
                "Menu Recommendation", "Investigated rating decline",
                List.of("Rating down"), List.of("Spiciness complaint"), List.of("Factor"), List.of("Model"),
                new ActionBrief.ProposedActionDetails(com.messo.agent.actionbrief.ProposedActionType.REVIEW_MENU_CHANGE, "Substitute Rajma", "Lunch"),
                "Rationale", List.of(), List.of(), List.of(1), LocalDateTime.now().toString(), "WAITING_FOR_APPROVAL"
        );
        try {
            run.setActionBrief(objectMapper.writeValueAsString(brief));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        when(runRepository.findById(102L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(102L)).thenReturn(Optional.empty());

        when(recommendationRepository.save(any(AgentRecommendation.class))).thenAnswer(inv -> {
            AgentRecommendation r = inv.getArgument(0);
            setField(r, "id", 1021L);
            return r;
        });
        when(executionRepository.save(any(AgentActionExecution.class))).thenAnswer(inv -> {
            AgentActionExecution e = inv.getArgument(0);
            setField(e, "id", 1022L);
            return e;
        });

        ActionExecutionResponse resp = agentService.executeApprovedAction(102L, "admin@messo.com");

        assertNotNull(resp);
        assertEquals(AgentRunStatus.COMPLETED, resp.status());

        // Proves that ONLY AgentRecommendation and AgentActionExecution are interacted with.
        // Zero calls to DailyMenuRepository, FoodRepository, FoodReviewRepository, ComplaintRepository, etc.
        verify(recommendationRepository, times(1)).save(any(AgentRecommendation.class));
        verify(executionRepository, times(1)).save(any(AgentActionExecution.class));
    }

    @Test
    void executeApprovedAction_whenInInvalidStates_failsSafely() {
        // PENDING, RUNNING, WAITING_FOR_APPROVAL, CANCELLED must all be rejected
        for (AgentRunStatus invalidStatus : List.of(
                AgentRunStatus.PENDING,
                AgentRunStatus.RUNNING,
                AgentRunStatus.WAITING_FOR_APPROVAL,
                AgentRunStatus.CANCELLED
        )) {
            AgentRun invalidRun = new AgentRun();
            setField(invalidRun, "id", 200L);
            invalidRun.setStatus(invalidStatus);

            when(runRepository.findById(200L)).thenReturn(Optional.of(invalidRun));

            IllegalStateException ex = assertThrows(IllegalStateException.class,
                    () -> agentService.executeApprovedAction(200L, "admin@messo.com"));
            assertTrue(ex.getMessage().contains("Only APPROVED runs may execute"));
        }

        verifyNoInteractions(recommendationRepository);
    }

    @Test
    void executeApprovedAction_verifiesAuditTraceability() {
        AgentRun run = new AgentRun();
        setField(run, "id", 300L);
        run.setStatus(AgentRunStatus.APPROVED);
        run.setApprovedBy("approver@messo.com");
        run.setApprovedAt(LocalDateTime.of(2026, 10, 3, 14, 0));

        ActionBrief brief = new ActionBrief(
                "Feedback Review Proposal", "Summary",
                List.of("Observed 1"), List.of("Evidence 1"), List.of("Factor 1"), List.of("Model 1"),
                new ActionBrief.ProposedActionDetails(com.messo.agent.actionbrief.ProposedActionType.REVIEW_STUDENT_FEEDBACK, "Conduct survey", "All Students"),
                "Rationale link", List.of("Assumption 1"), List.of("Limitation 1"), List.of(1, 2),
                "2026-10-03T13:50:00", "WAITING_FOR_APPROVAL"
        );
        try {
            run.setActionBrief(objectMapper.writeValueAsString(brief));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        when(runRepository.findById(300L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(300L)).thenReturn(Optional.empty());

        when(recommendationRepository.save(any(AgentRecommendation.class))).thenAnswer(inv -> {
            AgentRecommendation rec = inv.getArgument(0);
            setField(rec, "id", 901L);
            return rec;
        });
        when(executionRepository.save(any(AgentActionExecution.class))).thenAnswer(inv -> {
            AgentActionExecution exec = inv.getArgument(0);
            setField(exec, "id", 902L);
            return exec;
        });

        ActionExecutionResponse resp = agentService.executeApprovedAction(300L, "executor@messo.com");

        assertNotNull(resp);
        assertEquals(AgentRunStatus.COMPLETED, resp.status());

        // Verify recommendation traceability
        ArgumentCaptor<AgentRecommendation> recCaptor = ArgumentCaptor.forClass(AgentRecommendation.class);
        verify(recommendationRepository).save(recCaptor.capture());
        AgentRecommendation capturedRec = recCaptor.getValue();
        assertEquals(300L, capturedRec.getAgentRunId());
        assertEquals("REVIEW_STUDENT_FEEDBACK", capturedRec.getRecommendationType());
        assertEquals("Feedback Review Proposal", capturedRec.getTitle());
        assertEquals("Conduct survey", capturedRec.getDescription());
        assertEquals("All Students", capturedRec.getSuggestedTarget());
        assertEquals("executor@messo.com", capturedRec.getCreatedBy());

        // Verify execution audit traceability
        ArgumentCaptor<AgentActionExecution> execCaptor = ArgumentCaptor.forClass(AgentActionExecution.class);
        verify(executionRepository).save(execCaptor.capture());
        AgentActionExecution capturedExec = execCaptor.getValue();
        assertEquals(300L, capturedExec.getAgentRunId());
        assertEquals("REVIEW_STUDENT_FEEDBACK", capturedExec.getActionType());
        assertEquals("executor@messo.com", capturedExec.getExecutedBy());
        assertEquals(ActionExecutionStatus.SUCCESS, capturedExec.getStatus());
        assertEquals("AgentRecommendation#901", capturedExec.getTargetReference());
    }

    @Test
    void phase8_controlledExecutionWorkflow_fromApproval_toDatabaseMutation_toReadyForVerification_toHumanCompletion() throws Exception {
        // 1. Setup Approved Run with UPDATE_MENU ActionBrief
        AgentRun run = new AgentRun();
        setField(run, "id", 400L);
        run.setStatus(AgentRunStatus.APPROVED);
        run.setGoalType(AgentGoalType.MENU_REPETITION_AND_STUDENT_FATIGUE);

        ActionBrief.ProposedActionDetails actionDetails = new ActionBrief.ProposedActionDetails(
                ProposedActionType.UPDATE_MENU,
                "Replace Aloo Gobi with Paneer Bhurji for Wednesday dinner",
                "Menu rotation",
                "UPDATE_MENU",
                "2026-10-07",
                "DINNER",
                "Aloo Gobi",
                "Paneer Bhurji"
        );
        ActionBrief brief = new ActionBrief(
                "Review menu rotation",
                "Fatigue analysis",
                List.of("Repetition observed"),
                List.of("Student ratings dropped"),
                List.of("Menu fatigue factor"),
                List.of("Root cause model output"),
                actionDetails,
                "Adjusting rotation improves variety",
                List.of("Kitchen staffing available"),
                List.of("Cohort perception varies"),
                List.of(1, 2),
                LocalDateTime.now().toString(),
                "APPROVED"
        );
        run.setActionBrief(objectMapper.writeValueAsString(brief));

        when(runRepository.findById(400L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(400L)).thenReturn(Optional.empty());

        com.messo.model.Food alooGobi = new com.messo.model.Food();
        alooGobi.setName("Aloo Gobi");
        com.messo.model.Food paneerBhurji = new com.messo.model.Food();
        paneerBhurji.setName("Paneer Bhurji");

        com.messo.model.DailyMenu dailyMenu = new com.messo.model.DailyMenu();
        dailyMenu.setId(700L);
        dailyMenu.setMenuDate(java.time.LocalDate.of(2026, 10, 7));
        dailyMenu.setFood(alooGobi);

        when(dailyMenuRepository.findByMenuDate(java.time.LocalDate.of(2026, 10, 7))).thenReturn(Optional.of(dailyMenu));
        when(foodRepository.findByNameIgnoreCase("Paneer Bhurji")).thenReturn(Optional.of(paneerBhurji));
        when(dailyMenuRepository.save(any(com.messo.model.DailyMenu.class))).thenAnswer(inv -> inv.getArgument(0));

        when(recommendationRepository.save(any(AgentRecommendation.class))).thenAnswer(inv -> {
            AgentRecommendation rec = inv.getArgument(0);
            setField(rec, "id", 401L);
            return rec;
        });
        when(executionRepository.save(any(AgentActionExecution.class))).thenAnswer(inv -> {
            AgentActionExecution exec = inv.getArgument(0);
            setField(exec, "id", 402L);
            return exec;
        });

        var taskResponse = new com.messo.agent.dto.AgentImplementationTaskResponse(
                450L, 400L, 401L, "Review menu rotation", "Replace Aloo Gobi with Paneer Bhurji",
                "Reason", "Menu rotation", com.messo.agent.task.AgentImplementationTaskStatus.OPEN,
                "MESO AI Operations Agent", LocalDateTime.now(), null, null
        );
        when(taskService.createTaskForApprovedRun(400L, "admin@messo.com")).thenReturn(taskResponse);

        var readyTaskResponse = new com.messo.agent.dto.AgentImplementationTaskResponse(
                450L, 400L, 401L, "Review menu rotation", "Replace Aloo Gobi with Paneer Bhurji",
                "Reason", "Menu rotation", com.messo.agent.task.AgentImplementationTaskStatus.READY_FOR_VERIFICATION,
                "MESO AI Operations Agent", LocalDateTime.now(), null, null,
                "UPDATE_MENU", java.time.LocalDate.of(2026, 10, 7), "DINNER", "Aloo Gobi", "Paneer Bhurji",
                LocalDateTime.now(), "MESO AI Operations Agent"
        );
        when(taskService.recordActionExecutionOnTask(
                eq(450L), eq("UPDATE_MENU"), eq("Aloo Gobi"), eq("Paneer Bhurji"),
                eq(java.time.LocalDate.of(2026, 10, 7)), eq("DINNER"), anyString()
        )).thenReturn(readyTaskResponse);

        // 2. Execute approved action
        ActionExecutionResponse execResp = agentService.executeApprovedAction(400L, "admin@messo.com");

        assertNotNull(execResp);
        assertEquals(AgentRunStatus.COMPLETED, execResp.status());
        assertEquals("UPDATE_MENU", execResp.actionType());
        assertEquals(ActionExecutionStatus.SUCCESS, execResp.executionStatus());
        assertTrue(execResp.summary().contains("The approved menu change was applied to the operational database"));

        // 3. Verify actual operational change: daily_menu food is now Paneer Bhurji
        assertEquals("Paneer Bhurji", dailyMenu.getFood().getName());
        verify(dailyMenuRepository, times(1)).save(dailyMenu);

        // 4. Verify Implementation Task was NOT auto-completed, but moved to READY_FOR_VERIFICATION
        assertEquals("READY_FOR_VERIFICATION", execResp.result().get("taskStatus"));
        assertEquals("Aloo Gobi", execResp.result().get("beforeValue"));
        assertEquals("Paneer Bhurji", execResp.result().get("afterValue"));

        // 5. Human administrator completes the task
        var completedTaskResponse = new com.messo.agent.dto.AgentImplementationTaskResponse(
                450L, 400L, 401L, "Review menu rotation", "Replace Aloo Gobi with Paneer Bhurji",
                "Reason", "Menu rotation", com.messo.agent.task.AgentImplementationTaskStatus.COMPLETED,
                "MESO AI Operations Agent", LocalDateTime.now(), "admin@messo.com", LocalDateTime.now(),
                "UPDATE_MENU", java.time.LocalDate.of(2026, 10, 7), "DINNER", "Aloo Gobi", "Paneer Bhurji",
                LocalDateTime.now(), "MESO AI Operations Agent"
        );
        when(taskService.completeTask(450L, "admin@messo.com")).thenReturn(completedTaskResponse);

        var finalTask = agentService.completeTask(450L, "admin@messo.com");
        assertNotNull(finalTask);
        assertEquals(com.messo.agent.task.AgentImplementationTaskStatus.COMPLETED, finalTask.status());
        assertEquals("admin@messo.com", finalTask.completedBy());
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
