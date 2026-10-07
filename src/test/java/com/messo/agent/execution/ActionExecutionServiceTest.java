package com.messo.agent.execution;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.messo.agent.AgentGoalType;
import com.messo.agent.AgentRun;
import com.messo.agent.AgentRunRepository;
import com.messo.agent.AgentRunStatus;
import com.messo.agent.AgentTriggerType;
import com.messo.agent.actionbrief.ActionBrief;
import com.messo.agent.actionbrief.ProposedActionType;
import com.messo.agent.dto.ActionExecutionResponse;
import com.messo.agent.recommendation.AgentRecommendation;
import com.messo.agent.recommendation.AgentRecommendationRepository;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActionExecutionServiceTest {

    @Mock
    private AgentRunRepository runRepository;

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
    private ActionExecutionService executionService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        executionService = new ActionExecutionService(
                runRepository, executionRepository, recommendationRepository, objectMapper, taskService, dailyMenuRepository, foodRepository
        );
    }

    @Test
    void executeApprovedAction_whenApproved_createsRecommendationAndExecutionRecordAndCompletesRun() throws Exception {
        AgentRun run = buildRun(10L, AgentRunStatus.APPROVED);
        ActionBrief brief = createSampleBrief(ProposedActionType.REVIEW_MENU_CHANGE);
        run.setActionBrief(objectMapper.writeValueAsString(brief));

        when(runRepository.findById(10L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(10L)).thenReturn(Optional.empty());

        when(recommendationRepository.save(any(AgentRecommendation.class))).thenAnswer(inv -> {
            AgentRecommendation rec = inv.getArgument(0);
            setField(rec, "id", 101L);
            return rec;
        });

        when(executionRepository.save(any(AgentActionExecution.class))).thenAnswer(inv -> {
            AgentActionExecution exec = inv.getArgument(0);
            setField(exec, "id", 201L);
            return exec;
        });

        when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

        ActionExecutionResponse response = executionService.executeApprovedAction(10L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(10L, response.runId());
        assertEquals(AgentRunStatus.COMPLETED, response.status());
        assertEquals("REVIEW_MENU_CHANGE", response.actionType());
        assertEquals(ActionExecutionStatus.SUCCESS, response.executionStatus());
        assertNotNull(response.summary());
        assertEquals(101L, response.result().get("recommendationId"));

        // Verify recommendation saved
        ArgumentCaptor<AgentRecommendation> recCaptor = ArgumentCaptor.forClass(AgentRecommendation.class);
        verify(recommendationRepository).save(recCaptor.capture());
        AgentRecommendation capturedRec = recCaptor.getValue();
        assertEquals(10L, capturedRec.getAgentRunId());
        assertEquals("REVIEW_MENU_CHANGE", capturedRec.getRecommendationType());
        assertEquals("admin@messo.com", capturedRec.getCreatedBy());

        // Verify execution audit saved
        ArgumentCaptor<AgentActionExecution> execCaptor = ArgumentCaptor.forClass(AgentActionExecution.class);
        verify(executionRepository).save(execCaptor.capture());
        AgentActionExecution capturedExec = execCaptor.getValue();
        assertEquals(10L, capturedExec.getAgentRunId());
        assertEquals("admin@messo.com", capturedExec.getExecutedBy());
        assertEquals(ActionExecutionStatus.SUCCESS, capturedExec.getStatus());

        // Verify run transitioned to COMPLETED
        assertEquals(AgentRunStatus.COMPLETED, run.getStatus());
        assertNotNull(run.getCompletedAt());
    }

    @Test
    void executeApprovedAction_whenWaitingForApproval_throwsIllegalStateException() {
        AgentRun run = buildRun(11L, AgentRunStatus.WAITING_FOR_APPROVAL);
        when(runRepository.findById(11L)).thenReturn(Optional.of(run));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> executionService.executeApprovedAction(11L, "admin@messo.com"));
        assertTrue(ex.getMessage().contains("cannot be executed because status is WAITING_FOR_APPROVAL"));
        verifyNoInteractions(recommendationRepository);
    }

    @Test
    void executeApprovedAction_whenCancelled_throwsIllegalStateException() {
        AgentRun run = buildRun(12L, AgentRunStatus.CANCELLED);
        when(runRepository.findById(12L)).thenReturn(Optional.of(run));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> executionService.executeApprovedAction(12L, "admin@messo.com"));
        assertTrue(ex.getMessage().contains("cannot be executed because status is CANCELLED"));
        verifyNoInteractions(recommendationRepository);
    }

    @Test
    void executeApprovedAction_whenRunNotFound_throwsNoSuchElementException() {
        when(runRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class,
                () -> executionService.executeApprovedAction(999L, "admin@messo.com"));
    }

    @Test
    void executeApprovedAction_whenAlreadyCompleted_isIdempotentAndDoesNotDuplicate() {
        AgentRun run = buildRun(13L, AgentRunStatus.COMPLETED);
        AgentActionExecution existingExec = new AgentActionExecution();
        setField(existingExec, "id", 501L);
        existingExec.setAgentRunId(13L);
        existingExec.setActionType("REVIEW_MENU_CHANGE");
        existingExec.setStatus(ActionExecutionStatus.SUCCESS);
        existingExec.setResultSummary("Already completed");
        existingExec.setCompletedAt(LocalDateTime.now());

        when(runRepository.findById(13L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(13L)).thenReturn(Optional.of(existingExec));

        ActionExecutionResponse response = executionService.executeApprovedAction(13L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(13L, response.runId());
        assertEquals(AgentRunStatus.COMPLETED, response.status());
        assertEquals(ActionExecutionStatus.SUCCESS, response.executionStatus());
        assertTrue(response.summary().contains("idempotent call"));
        assertEquals(true, response.result().get("idempotent"));

        // Verify NO duplicate recommendation or execution saved
        verifyNoInteractions(recommendationRepository);
        verify(executionRepository, never()).save(any());
    }

    @Test
    void executeApprovedAction_whenActionBriefMissing_failsSafelyAndMarksRunFailed() {
        AgentRun run = buildRun(14L, AgentRunStatus.APPROVED);
        run.setActionBrief(null);

        when(runRepository.findById(14L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(14L)).thenReturn(Optional.empty());

        ActionExecutionResponse response = executionService.executeApprovedAction(14L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(AgentRunStatus.FAILED, response.status());
        assertEquals(ActionExecutionStatus.FAILED, response.executionStatus());
        assertEquals("MISSING_ACTION_BRIEF", run.getFailureCode());
        verify(executionRepository, times(1)).save(any(AgentActionExecution.class));
        verifyNoInteractions(recommendationRepository);
    }

    @Test
    void executeApprovedAction_whenActionBriefMalformed_failsSafelyAndMarksRunFailed() {
        AgentRun run = buildRun(15L, AgentRunStatus.APPROVED);
        run.setActionBrief("invalid-json{}}");

        when(runRepository.findById(15L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(15L)).thenReturn(Optional.empty());

        ActionExecutionResponse response = executionService.executeApprovedAction(15L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(AgentRunStatus.FAILED, response.status());
        assertEquals(ActionExecutionStatus.FAILED, response.executionStatus());
        assertEquals("MALFORMED_ACTION_BRIEF", run.getFailureCode());
        verify(executionRepository, times(1)).save(any(AgentActionExecution.class));
        verifyNoInteractions(recommendationRepository);
    }

    @Test
    void executeApprovedAction_whenUnsupportedActionType_failsSafelyAndMarksRunFailed() throws Exception {
        AgentRun run = buildRun(16L, AgentRunStatus.APPROVED);
        ActionBrief brief = createSampleBrief(ProposedActionType.CREATE_ADMIN_FOLLOWUP);
        run.setActionBrief(objectMapper.writeValueAsString(brief));

        when(runRepository.findById(16L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(16L)).thenReturn(Optional.empty());

        ActionExecutionResponse response = executionService.executeApprovedAction(16L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(AgentRunStatus.FAILED, response.status());
        assertEquals(ActionExecutionStatus.FAILED, response.executionStatus());
        assertEquals("UNSUPPORTED_ACTION_TYPE", run.getFailureCode());
        verify(executionRepository, times(1)).save(any(AgentActionExecution.class));
        verifyNoInteractions(recommendationRepository);
    }

    @Test
    void executeApprovedAction_whenConcurrentRaceCausesDataIntegrityViolation_recoversIdempotentlyIfRecordExists() throws Exception {
        AgentRun run = buildRun(17L, AgentRunStatus.APPROVED);
        ActionBrief brief = createSampleBrief(ProposedActionType.REVIEW_MENU_CHANGE);
        run.setActionBrief(objectMapper.writeValueAsString(brief));

        when(runRepository.findById(17L)).thenReturn(Optional.of(run));
        // First check: absent
        when(executionRepository.findByAgentRunId(17L))
                .thenReturn(Optional.empty())
                .thenAnswer(inv -> {
                    // After race, existing execution is now present:
                    AgentActionExecution raced = new AgentActionExecution();
                    setField(raced, "id", 999L);
                    raced.setAgentRunId(17L);
                    raced.setActionType("REVIEW_MENU_CHANGE");
                    raced.setStatus(ActionExecutionStatus.SUCCESS);
                    raced.setResultSummary("Executed by concurrent thread");
                    raced.setCompletedAt(LocalDateTime.now());
                    return Optional.of(raced);
                });

        when(recommendationRepository.save(any(AgentRecommendation.class)))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException("Duplicate key error uk_action_execution_run_id"));

        ActionExecutionResponse response = executionService.executeApprovedAction(17L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(17L, response.runId());
        assertEquals(AgentRunStatus.COMPLETED, response.status());
        assertEquals(ActionExecutionStatus.SUCCESS, response.executionStatus());
        assertTrue(response.summary().contains("idempotent recovery"));
        assertEquals(true, response.result().get("idempotent"));
    }

    @Test
    void executeApprovedAction_whenExecutionThrowsException_marksRunFailedAndAuditLogged() throws Exception {
        AgentRun run = buildRun(18L, AgentRunStatus.APPROVED);
        ActionBrief brief = createSampleBrief(ProposedActionType.REVIEW_MENU_CHANGE);
        run.setActionBrief(objectMapper.writeValueAsString(brief));

        when(runRepository.findById(18L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(18L)).thenReturn(Optional.empty());

        when(recommendationRepository.save(any(AgentRecommendation.class)))
                .thenThrow(new RuntimeException("Database connection timeout during save"));

        ActionExecutionResponse response = executionService.executeApprovedAction(18L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(AgentRunStatus.FAILED, response.status());
        assertEquals(ActionExecutionStatus.FAILED, response.executionStatus());
        assertEquals("ACTION_EXECUTION_FAILED", run.getFailureCode());
        assertTrue(run.getFailureReason().contains("Database connection timeout"));

        // Verify execution audit logged as FAILED
        ArgumentCaptor<AgentActionExecution> execCaptor = ArgumentCaptor.forClass(AgentActionExecution.class);
        verify(executionRepository).save(execCaptor.capture());
        assertEquals(ActionExecutionStatus.FAILED, execCaptor.getValue().getStatus());
        assertEquals("ACTION_EXECUTION_FAILED", execCaptor.getValue().getErrorCode());
    }

    // =========================================================================
    // PHASE 8: CONTROLLED APPROVED ACTION EXECUTION (UPDATE_MENU) TESTS
    // =========================================================================

    @Test
    void executeApprovedAction_whenUpdateMenu_successfullyUpdatesDailyMenu_andTransitionsTaskToReadyForVerification() throws Exception {
        AgentRun run = buildRun(20L, AgentRunStatus.APPROVED);
        ActionBrief brief = new ActionBrief(
                "Review menu rotation",
                "Repetition fatigue detected",
                List.of("Observation"),
                List.of("Evidence"),
                List.of("Possible factor"),
                List.of("Model output"),
                new ActionBrief.ProposedActionDetails(
                        ProposedActionType.UPDATE_MENU,
                        "Replace Aloo Gobi with Paneer Bhurji",
                        "Menu rotation",
                        "UPDATE_MENU",
                        "2026-10-07",
                        "DINNER",
                        "Aloo Gobi",
                        "Paneer Bhurji"
                ),
                "Rationale",
                List.of("Assumption"),
                List.of("Limitation"),
                List.of(1, 2),
                LocalDateTime.now().toString(),
                "WAITING_FOR_APPROVAL"
        );
        run.setActionBrief(objectMapper.writeValueAsString(brief));

        when(runRepository.findById(20L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(20L)).thenReturn(Optional.empty());

        com.messo.model.Food alooGobi = new com.messo.model.Food();
        alooGobi.setId(101L);
        alooGobi.setName("Aloo Gobi");
        alooGobi.setMealType("Lunch");

        com.messo.model.Food paneerBhurji = new com.messo.model.Food();
        paneerBhurji.setId(102L);
        paneerBhurji.setName("Paneer Bhurji");
        paneerBhurji.setMealType("Dinner");

        com.messo.model.DailyMenu dailyMenu = new com.messo.model.DailyMenu();
        dailyMenu.setId(501L);
        dailyMenu.setMenuDate(java.time.LocalDate.of(2026, 10, 7));
        dailyMenu.setFood(alooGobi);

        when(dailyMenuRepository.findByMenuDate(java.time.LocalDate.of(2026, 10, 7))).thenReturn(Optional.of(dailyMenu));
        when(foodRepository.findByNameIgnoreCase("Paneer Bhurji")).thenReturn(Optional.of(paneerBhurji));
        when(dailyMenuRepository.save(any(com.messo.model.DailyMenu.class))).thenAnswer(inv -> inv.getArgument(0));

        when(recommendationRepository.save(any(AgentRecommendation.class))).thenAnswer(inv -> {
            AgentRecommendation r = inv.getArgument(0);
            setField(r, "id", 201L);
            return r;
        });

        when(executionRepository.save(any(AgentActionExecution.class))).thenAnswer(inv -> {
            AgentActionExecution e = inv.getArgument(0);
            setField(e, "id", 301L);
            return e;
        });

        var taskResponse = new com.messo.agent.dto.AgentImplementationTaskResponse(
                55L, 20L, 201L, "Review menu rotation", "Replace Aloo Gobi with Paneer Bhurji",
                "Reason", "Menu rotation", com.messo.agent.task.AgentImplementationTaskStatus.OPEN,
                "MESO AI Operations Agent", LocalDateTime.now(), null, null
        );
        when(taskService.createTaskForApprovedRun(20L, "admin@messo.com")).thenReturn(taskResponse);

        var updatedTaskResponse = new com.messo.agent.dto.AgentImplementationTaskResponse(
                55L, 20L, 201L, "Review menu rotation", "Replace Aloo Gobi with Paneer Bhurji",
                "Reason", "Menu rotation", com.messo.agent.task.AgentImplementationTaskStatus.READY_FOR_VERIFICATION,
                "MESO AI Operations Agent", LocalDateTime.now(), null, null,
                "UPDATE_MENU", java.time.LocalDate.of(2026, 10, 7), "DINNER", "Aloo Gobi", "Paneer Bhurji",
                LocalDateTime.now(), "MESO AI Operations Agent"
        );
        when(taskService.recordActionExecutionOnTask(
                eq(55L), eq("UPDATE_MENU"), eq("Aloo Gobi"), eq("Paneer Bhurji"),
                eq(java.time.LocalDate.of(2026, 10, 7)), eq("DINNER"), anyString()
        )).thenReturn(updatedTaskResponse);

        ActionExecutionResponse response = executionService.executeApprovedAction(20L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(AgentRunStatus.COMPLETED, response.status());
        assertEquals(ActionExecutionStatus.SUCCESS, response.executionStatus());
        assertEquals("UPDATE_MENU", response.actionType());
        assertTrue(response.summary().contains("The approved menu change was applied to the operational database"));

        // Verify DailyMenu food was mutated to Paneer Bhurji
        assertEquals("Paneer Bhurji", dailyMenu.getFood().getName());
        verify(dailyMenuRepository, times(1)).save(dailyMenu);

        // Verify implementation task was updated to READY_FOR_VERIFICATION (NOT COMPLETED!)
        verify(taskService, times(1)).recordActionExecutionOnTask(
                eq(55L), eq("UPDATE_MENU"), eq("Aloo Gobi"), eq("Paneer Bhurji"),
                eq(java.time.LocalDate.of(2026, 10, 7)), eq("DINNER"), anyString()
        );
        assertEquals("55", response.result().get("taskId").toString());
        assertEquals("READY_FOR_VERIFICATION", response.result().get("taskStatus"));
        assertEquals("Aloo Gobi", response.result().get("beforeValue"));
        assertEquals("Paneer Bhurji", response.result().get("afterValue"));

        // Verify execution audit logged as SUCCESS
        ArgumentCaptor<AgentActionExecution> execCaptor = ArgumentCaptor.forClass(AgentActionExecution.class);
        verify(executionRepository).save(execCaptor.capture());
        assertEquals(ActionExecutionStatus.SUCCESS, execCaptor.getValue().getStatus());
        assertEquals("UPDATE_MENU", execCaptor.getValue().getActionType());
        assertTrue(execCaptor.getValue().getResultSummary().contains("DailyMenu#501@2026-10-07") ||
                   execCaptor.getValue().getTargetReference().contains("DailyMenu#501@2026-10-07"));
    }

    @Test
    void executeApprovedAction_whenUpdateMenu_andMenuNotFound_failsSafelyWithoutModifyingDailyMenu() throws Exception {
        AgentRun run = buildRun(21L, AgentRunStatus.APPROVED);
        ActionBrief brief = new ActionBrief(
                "Review menu rotation", "Repetition fatigue", List.of(), List.of(), List.of(), List.of(),
                new ActionBrief.ProposedActionDetails(
                        ProposedActionType.UPDATE_MENU, "Desc", "Target",
                        "UPDATE_MENU", "2026-10-07", "DINNER", "Aloo Gobi", "Paneer Bhurji"
                ),
                "Rationale", List.of(), List.of(), List.of(1), LocalDateTime.now().toString(), "WAITING_FOR_APPROVAL"
        );
        run.setActionBrief(objectMapper.writeValueAsString(brief));

        when(runRepository.findById(21L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(21L)).thenReturn(Optional.empty());
        when(dailyMenuRepository.findByMenuDate(java.time.LocalDate.of(2026, 10, 7))).thenReturn(Optional.empty());

        ActionExecutionResponse response = executionService.executeApprovedAction(21L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(AgentRunStatus.FAILED, response.status());
        assertEquals(ActionExecutionStatus.FAILED, response.executionStatus());
        assertEquals("MENU_NOT_FOUND", run.getFailureCode());
        verify(dailyMenuRepository, never()).save(any());
    }

    @Test
    void executeApprovedAction_whenUpdateMenu_andCurrentFoodStale_failsSafelyToPreventOverwrite() throws Exception {
        AgentRun run = buildRun(22L, AgentRunStatus.APPROVED);
        ActionBrief brief = new ActionBrief(
                "Review menu rotation", "Repetition fatigue", List.of(), List.of(), List.of(), List.of(),
                new ActionBrief.ProposedActionDetails(
                        ProposedActionType.UPDATE_MENU, "Desc", "Target",
                        "UPDATE_MENU", "2026-10-07", "DINNER", "Aloo Gobi", "Paneer Bhurji"
                ),
                "Rationale", List.of(), List.of(), List.of(1), LocalDateTime.now().toString(), "WAITING_FOR_APPROVAL"
        );
        run.setActionBrief(objectMapper.writeValueAsString(brief));

        when(runRepository.findById(22L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(22L)).thenReturn(Optional.empty());

        // Food on menu is actually Rajma Chawal, not Aloo Gobi (stale conflict)
        com.messo.model.Food rajma = new com.messo.model.Food();
        rajma.setName("Rajma Chawal");
        com.messo.model.DailyMenu dailyMenu = new com.messo.model.DailyMenu();
        dailyMenu.setFood(rajma);
        dailyMenu.setMenuDate(java.time.LocalDate.of(2026, 10, 7));

        when(dailyMenuRepository.findByMenuDate(java.time.LocalDate.of(2026, 10, 7))).thenReturn(Optional.of(dailyMenu));

        ActionExecutionResponse response = executionService.executeApprovedAction(22L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(AgentRunStatus.FAILED, response.status());
        assertEquals(ActionExecutionStatus.FAILED, response.executionStatus());
        assertEquals("STALE_MENU_STATE", run.getFailureCode());
        assertEquals("Rajma Chawal", dailyMenu.getFood().getName());
        verify(dailyMenuRepository, never()).save(any());
    }

    @Test
    void executeApprovedAction_whenUpdateMenu_andProposedFoodNotFoundInCatalog_failsSafely() throws Exception {
        AgentRun run = buildRun(23L, AgentRunStatus.APPROVED);
        ActionBrief brief = new ActionBrief(
                "Review menu rotation", "Repetition fatigue", List.of(), List.of(), List.of(), List.of(),
                new ActionBrief.ProposedActionDetails(
                        ProposedActionType.UPDATE_MENU, "Desc", "Target",
                        "UPDATE_MENU", "2026-10-07", "DINNER", "Aloo Gobi", "NonExistentSpecialDish"
                ),
                "Rationale", List.of(), List.of(), List.of(1), LocalDateTime.now().toString(), "WAITING_FOR_APPROVAL"
        );
        run.setActionBrief(objectMapper.writeValueAsString(brief));

        when(runRepository.findById(23L)).thenReturn(Optional.of(run));
        when(executionRepository.findByAgentRunId(23L)).thenReturn(Optional.empty());

        com.messo.model.Food alooGobi = new com.messo.model.Food();
        alooGobi.setName("Aloo Gobi");
        com.messo.model.DailyMenu dailyMenu = new com.messo.model.DailyMenu();
        dailyMenu.setFood(alooGobi);
        dailyMenu.setMenuDate(java.time.LocalDate.of(2026, 10, 7));

        when(dailyMenuRepository.findByMenuDate(java.time.LocalDate.of(2026, 10, 7))).thenReturn(Optional.of(dailyMenu));
        when(foodRepository.findByNameIgnoreCase("NonExistentSpecialDish")).thenReturn(Optional.empty());

        ActionExecutionResponse response = executionService.executeApprovedAction(23L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(AgentRunStatus.FAILED, response.status());
        assertEquals("PROPOSED_FOOD_NOT_FOUND", run.getFailureCode());
        assertEquals("Aloo Gobi", dailyMenu.getFood().getName());
        verify(dailyMenuRepository, never()).save(any());
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private ActionBrief createSampleBrief(ProposedActionType actionType) {
        return new ActionBrief(
                "Review Dinner Menu",
                "Investigated spice variation",
                List.of("Rating dropped"),
                List.of("Spice complaints"),
                List.of("Spice inconsistency"),
                List.of("WHY engine p < 0.05"),
                new ActionBrief.ProposedActionDetails(actionType, "Substitute item", "Dinner"),
                "Rationale description",
                List.of("Assumptions"),
                List.of("Limitations"),
                List.of(1, 2),
                LocalDateTime.now().toString(),
                "WAITING_FOR_APPROVAL"
        );
    }

    private AgentRun buildRun(Long id, AgentRunStatus status) {
        AgentRun run = new AgentRun();
        setField(run, "id", id);
        run.setStatus(status);
        run.setGoalType(AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE);
        run.setTriggerType(AgentTriggerType.MANUAL);
        run.setInitiatedBy("admin@test.com");
        return run;
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
