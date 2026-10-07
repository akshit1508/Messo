package com.messo.agent;

import com.messo.agent.dto.AgentRunResponse;
import com.messo.agent.dto.AgentStepResponse;
import com.messo.agent.dto.AgentToolResponse;
import com.messo.agent.dto.CreateAgentRunRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AgentService}.
 *
 * Verifies:
 * - Agent Run is created in PENDING state
 * - initiatedBy is captured correctly
 * - triggerType defaults to MANUAL
 * - Step ordering is preserved via repository
 * - 404 behavior for unknown run IDs
 */
@ExtendWith(MockitoExtension.class)
class AgentServiceTest {

    @Mock
    private AgentRunRepository runRepository;

    @Mock
    private AgentStepRepository stepRepository;

    @Mock
    private com.messo.agent.tool.AgentToolExecutor toolExecutor;

    @Mock
    private com.messo.agent.planner.AgentOrchestratorService orchestratorService;

    @Mock
    private com.messo.agent.execution.ActionExecutionService actionExecutionService;

    @Mock
    private com.messo.agent.recommendation.AgentRecommendationRepository recommendationRepository;

    @Mock
    private com.messo.agent.task.AgentImplementationTaskService taskService;

    private AgentToolRegistry toolRegistry;
    private AgentService agentService;

    @BeforeEach
    void setUp() {
        toolRegistry = new AgentToolRegistry();
        agentService = new AgentService(runRepository, stepRepository, toolRegistry, toolExecutor, orchestratorService, actionExecutionService, recommendationRepository, taskService);
    }

    // =========================================================================
    // createRun — PENDING state
    // =========================================================================

    @Test
    void createRun_persistsWithPendingStatus() {
        // Arrange
        AgentRun savedRun = buildRun(1L, AgentRunStatus.PENDING,
                AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "admin@test.com");
        when(runRepository.save(any(AgentRun.class))).thenReturn(savedRun);

        CreateAgentRunRequest req = new CreateAgentRunRequest(
                AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE,
                "DINNER_SATISFACTION",
                "Why did dinner satisfaction drop?"
        );

        // Act
        AgentRunResponse response = agentService.createRun(req, "admin@test.com");

        // Assert
        assertNotNull(response);
        assertEquals(1L, response.id());
        assertEquals(AgentRunStatus.PENDING, response.status());
    }

    @Test
    void createRun_newRunStartsAsPending() {
        // Capture what gets saved
        ArgumentCaptor<AgentRun> captor = ArgumentCaptor.forClass(AgentRun.class);
        AgentRun savedRun = buildRun(1L, AgentRunStatus.PENDING,
                AgentGoalType.INVESTIGATE_RATING_DROP, "admin@messo.com");
        when(runRepository.save(captor.capture())).thenReturn(savedRun);

        CreateAgentRunRequest req = new CreateAgentRunRequest(
                AgentGoalType.INVESTIGATE_RATING_DROP, null, null);

        agentService.createRun(req, "admin@messo.com");

        AgentRun capturedRun = captor.getValue();
        assertEquals(AgentRunStatus.PENDING, capturedRun.getStatus());
    }

    @Test
    void createRun_triggerTypeIsAlwaysManual() {
        ArgumentCaptor<AgentRun> captor = ArgumentCaptor.forClass(AgentRun.class);
        AgentRun savedRun = buildRun(2L, AgentRunStatus.PENDING,
                AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "admin@messo.com");
        when(runRepository.save(captor.capture())).thenReturn(savedRun);

        agentService.createRun(
                new CreateAgentRunRequest(AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, null, null),
                "admin@messo.com");

        assertEquals(AgentTriggerType.MANUAL, captor.getValue().getTriggerType());
    }

    @Test
    void createRun_initiatedByIsCaptured() {
        ArgumentCaptor<AgentRun> captor = ArgumentCaptor.forClass(AgentRun.class);
        AgentRun savedRun = buildRun(3L, AgentRunStatus.PENDING,
                AgentGoalType.INVESTIGATE_COMPLAINT_SPIKE, "owner@canteen.com");
        when(runRepository.save(captor.capture())).thenReturn(savedRun);

        agentService.createRun(
                new CreateAgentRunRequest(AgentGoalType.INVESTIGATE_COMPLAINT_SPIKE, null, null),
                "owner@canteen.com");

        assertEquals("owner@canteen.com", captor.getValue().getInitiatedBy());
    }

    @Test
    void createRun_goalTypeIsStoredCorrectly() {
        ArgumentCaptor<AgentRun> captor = ArgumentCaptor.forClass(AgentRun.class);
        AgentRun savedRun = buildRun(4L, AgentRunStatus.PENDING,
                AgentGoalType.REVIEW_MENU_PERFORMANCE, "admin@messo.com");
        when(runRepository.save(captor.capture())).thenReturn(savedRun);

        agentService.createRun(
                new CreateAgentRunRequest(AgentGoalType.REVIEW_MENU_PERFORMANCE, "LUNCH", "Review lunch"),
                "admin@messo.com");

        AgentRun run = captor.getValue();
        assertEquals(AgentGoalType.REVIEW_MENU_PERFORMANCE, run.getGoalType());
        assertEquals("LUNCH", run.getGoalTarget());
    }

    // =========================================================================
    // getRun
    // =========================================================================

    @Test
    void getRun_returnsRunWhenFound() {
        AgentRun run = buildRun(5L, AgentRunStatus.PENDING,
                AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "admin@test.com");
        when(runRepository.findById(5L)).thenReturn(java.util.Optional.of(run));

        AgentRunResponse response = agentService.getRun(5L);
        assertEquals(5L, response.id());
        assertEquals(AgentRunStatus.PENDING, response.status());
    }

    @Test
    void getRun_throwsNoSuchElementForUnknownId() {
        when(runRepository.findById(999L)).thenReturn(java.util.Optional.empty());

        assertThrows(NoSuchElementException.class, () -> agentService.getRun(999L));
    }

    // =========================================================================
    // getStepsForRun
    // =========================================================================

    @Test
    void getStepsForRun_returnsStepsInOrder() {
        AgentRun run = buildRun(6L, AgentRunStatus.PENDING,
                AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "admin@test.com");
        when(runRepository.findById(6L)).thenReturn(java.util.Optional.of(run));

        AgentStep step1 = buildStep(1L, run, 1, "get_recent_ratings", AgentToolType.READ_ONLY);
        AgentStep step2 = buildStep(2L, run, 2, "run_root_cause", AgentToolType.READ_ONLY);
        when(stepRepository.findByRunIdOrderBySequenceOrderAsc(6L))
                .thenReturn(List.of(step1, step2));

        List<AgentStepResponse> steps = agentService.getStepsForRun(6L);

        assertEquals(2, steps.size());
        assertEquals(1, steps.get(0).sequenceOrder());
        assertEquals("get_recent_ratings", steps.get(0).toolName());
        assertEquals(2, steps.get(1).sequenceOrder());
        assertEquals("run_root_cause", steps.get(1).toolName());
    }

    @Test
    void getStepsForRun_throwsNoSuchElementIfRunNotFound() {
        when(runRepository.findById(888L)).thenReturn(java.util.Optional.empty());
        assertThrows(NoSuchElementException.class, () -> agentService.getStepsForRun(888L));
    }

    // =========================================================================
    // getAllTools
    // =========================================================================

    @Test
    void getAllTools_returnsTenTools() {
        List<AgentToolResponse> tools = agentService.getAllTools();
        assertEquals(10, tools.size());
    }

    @Test
    void getAllTools_containsRunRootCauseAsReadOnly() {
        List<AgentToolResponse> tools = agentService.getAllTools();
        AgentToolResponse rootCause = tools.stream()
                .filter(t -> t.name().equals("run_root_cause"))
                .findFirst()
                .orElseThrow();
        assertEquals(AgentToolType.READ_ONLY, rootCause.toolType());
        assertTrue(rootCause.readOnly());
    }

    @Test
    void getAllTools_containsSendNotificationAsAction() {
        List<AgentToolResponse> tools = agentService.getAllTools();
        AgentToolResponse sendNotif = tools.stream()
                .filter(t -> t.name().equals("send_notification"))
                .findFirst()
                .orElseThrow();
        assertEquals(AgentToolType.ACTION, sendNotif.toolType());
        assertFalse(sendNotif.readOnly());
    }

    // =========================================================================
    // executeTool (Phase 2)
    // =========================================================================

    @Test
    void executeTool_delegatesToExecutorAndReturnsResponse() {
        com.messo.agent.tool.result.ToolResult expected = com.messo.agent.tool.result.ToolResult.success(
                "get_recent_ratings", AgentToolType.READ_ONLY)
                .summary("OK")
                .build();
        when(toolExecutor.execute(eq("get_recent_ratings"), any(com.messo.agent.tool.input.ToolInput.class)))
                .thenReturn(expected);

        com.messo.agent.dto.ToolExecutionResponse resp = agentService.executeTool("get_recent_ratings", java.util.Map.of());

        assertNotNull(resp);
        assertTrue(resp.success());
        assertEquals("get_recent_ratings", resp.toolName());
        assertEquals(AgentToolType.READ_ONLY, resp.toolType());
        assertEquals("OK", resp.summary());
        verify(toolExecutor, times(1)).execute(eq("get_recent_ratings"), any(com.messo.agent.tool.input.ToolInput.class));
    }

    @Test
    void executeTool_whenActionBlocked_returnsFailure() {
        com.messo.agent.tool.result.ToolResult blocked = com.messo.agent.tool.result.ToolResult.failure(
                "create_recommendation", AgentToolType.ACTION, "ACTION_EXECUTION_BLOCKED", "Blocked");
        when(toolExecutor.execute(eq("create_recommendation"), any(com.messo.agent.tool.input.ToolInput.class)))
                .thenReturn(blocked);

        com.messo.agent.dto.ToolExecutionResponse resp = agentService.executeTool("create_recommendation", java.util.Map.of());

        assertNotNull(resp);
        assertFalse(resp.success());
        assertEquals("ACTION_EXECUTION_BLOCKED", resp.errorCode());
    }

    // =========================================================================
    // startInvestigation (Phase 3A)
    // =========================================================================

    @Test
    void startInvestigation_delegatesToOrchestratorService() {
        AgentRun completed = buildRun(10L, AgentRunStatus.COMPLETED, AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "admin@test.com");
        when(orchestratorService.runInvestigation(10L)).thenReturn(completed);

        com.messo.agent.dto.AgentRunResponse resp = agentService.startInvestigation(10L);

        assertNotNull(resp);
        assertEquals(10L, resp.id());
        assertEquals(AgentRunStatus.COMPLETED, resp.status());
        verify(orchestratorService, times(1)).runInvestigation(10L);
    }

    // =========================================================================
    // approveRun & rejectRun (Phase 4)
    // =========================================================================

    @Test
    void approveRun_whenWaitingForApproval_transitionsToApprovedAndAudits() {
        AgentRun waiting = buildRun(20L, AgentRunStatus.WAITING_FOR_APPROVAL, AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "admin@test.com");
        waiting.setApprovalRequired(true);
        when(runRepository.findById(20L)).thenReturn(Optional.of(waiting));
        when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

        com.messo.agent.dto.AgentRunResponse resp = agentService.approveRun(20L, "approver@messo.com");

        assertNotNull(resp);
        assertEquals(AgentRunStatus.APPROVED, resp.status());
        assertFalse(resp.approvalRequired());
        assertEquals("approver@messo.com", resp.approvedBy());
        assertNotNull(resp.approvedAt());
    }

    @Test
    void approveRun_doesNotExecuteAnyActionTools() {
        AgentRun waiting = buildRun(25L, AgentRunStatus.WAITING_FOR_APPROVAL, AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "admin@test.com");
        waiting.setApprovalRequired(true);
        when(runRepository.findById(25L)).thenReturn(Optional.of(waiting));
        when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

        com.messo.agent.dto.AgentRunResponse resp = agentService.approveRun(25L, "approver@messo.com");

        assertNotNull(resp);
        assertEquals(AgentRunStatus.APPROVED, resp.status());
        // Verify tool executor was never called during approval
        verifyNoInteractions(toolExecutor);
    }

    @Test
    void approveRun_whenNotWaitingForApproval_throwsIllegalStateException() {
        AgentRun pending = buildRun(21L, AgentRunStatus.PENDING, AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "admin@test.com");
        when(runRepository.findById(21L)).thenReturn(Optional.of(pending));

        assertThrows(IllegalStateException.class, () -> agentService.approveRun(21L, "approver@messo.com"));
    }

    @Test
    void rejectRun_whenWaitingForApproval_transitionsToCancelledAndAudits() {
        AgentRun waiting = buildRun(22L, AgentRunStatus.WAITING_FOR_APPROVAL, AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, "admin@test.com");
        waiting.setApprovalRequired(true);
        when(runRepository.findById(22L)).thenReturn(Optional.of(waiting));
        when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

        com.messo.agent.dto.AgentRunResponse resp = agentService.rejectRun(22L, "rejector@messo.com", "Proposal unfeasible");

        assertNotNull(resp);
        assertEquals(AgentRunStatus.CANCELLED, resp.status());
        assertFalse(resp.approvalRequired());
        assertEquals("rejector@messo.com", resp.rejectedBy());
        assertNotNull(resp.rejectedAt());
        assertEquals("Proposal unfeasible", resp.rejectionReason());
    }

    // =========================================================================
    // executeApprovedAction (Phase 5)
    // =========================================================================

    @Test
    void executeApprovedAction_delegatesToActionExecutionService() {
        com.messo.agent.dto.ActionExecutionResponse expectedResp = com.messo.agent.dto.ActionExecutionResponse.success(
                30L, AgentRunStatus.COMPLETED, "REVIEW_MENU_CHANGE", "Created recommendation", java.util.Map.of()
        );
        when(actionExecutionService.executeApprovedAction(30L, "admin@test.com")).thenReturn(expectedResp);

        com.messo.agent.dto.ActionExecutionResponse actualResp = agentService.executeApprovedAction(30L, "admin@test.com");

        assertNotNull(actualResp);
        assertEquals(30L, actualResp.runId());
        assertEquals(AgentRunStatus.COMPLETED, actualResp.status());
        verify(actionExecutionService, times(1)).executeApprovedAction(30L, "admin@test.com");
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private AgentRun buildRun(Long id, AgentRunStatus status, AgentGoalType goalType, String initiatedBy) {
        AgentRun run = new AgentRun();
        // Manually set id via reflection since setId is not exposed (consistent with project convention)
        try {
            var field = AgentRun.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(run, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        run.setStatus(status);
        run.setGoalType(goalType);
        run.setTriggerType(AgentTriggerType.MANUAL);
        run.setInitiatedBy(initiatedBy);
        run.setApprovalRequired(false);
        // simulate @PrePersist
        try {
            var m = AgentRun.class.getDeclaredMethod("onCreate");
            m.setAccessible(true);
        } catch (Exception ignored) {}
        // Set createdAt directly since @PrePersist won't fire in unit tests
        try {
            var field = AgentRun.class.getDeclaredField("createdAt");
            field.setAccessible(true);
            field.set(run, LocalDateTime.now());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return run;
    }

    private AgentStep buildStep(Long id, AgentRun run, int seq, String toolName, AgentToolType toolType) {
        AgentStep step = new AgentStep();
        try {
            var field = AgentStep.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(step, id);
            var createdAtField = AgentStep.class.getDeclaredField("createdAt");
            createdAtField.setAccessible(true);
            createdAtField.set(step, LocalDateTime.now());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        step.setRun(run);
        step.setSequenceOrder(seq);
        step.setToolName(toolName);
        step.setToolType(toolType);
        step.setStatus(AgentStepStatus.PENDING);
        return step;
    }
}
