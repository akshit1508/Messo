package com.messo.agent.task;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.messo.agent.AgentRun;
import com.messo.agent.AgentRunRepository;
import com.messo.agent.AgentRunStatus;
import com.messo.agent.dto.AgentImplementationTaskResponse;
import com.messo.agent.recommendation.AgentRecommendation;
import com.messo.agent.recommendation.AgentRecommendationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgentImplementationTaskTest {

    @Mock
    private AgentImplementationTaskRepository taskRepository;

    @Mock
    private AgentRunRepository runRepository;

    @Mock
    private AgentRecommendationRepository recommendationRepository;

    private ObjectMapper objectMapper;
    private AgentImplementationTaskService taskService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        taskService = new AgentImplementationTaskService(
                taskRepository,
                runRepository,
                recommendationRepository,
                objectMapper
        );
    }

    // =========================================================================
    // 1. Task Creation & Approval Gating
    // =========================================================================

    @Test
    void createTaskForApprovedRun_whenApproved_createsOpenTaskWithServerDerivedContent() {
        AgentRun run = new AgentRun();
        setField(run, "id", 101L);
        run.setStatus(AgentRunStatus.APPROVED);
        run.setGoalTarget("DINNER_SATISFACTION");

        AgentRecommendation rec = new AgentRecommendation();
        rec.setId(501L);
        rec.setAgentRunId(101L);
        rec.setRecommendationType("REVIEW_MENU_CHANGE");
        rec.setTitle("Review Dinner Menu Rotation");
        rec.setDescription("Evaluate alternate dal and paneer options for Friday dinner.");
        rec.setRationale("Dinner satisfaction dropped 15% following repeated dal preparation.");
        rec.setSuggestedTarget("DINNER_SATISFACTION");

        when(runRepository.findById(101L)).thenReturn(Optional.of(run));
        when(taskRepository.findByAgentRunId(101L)).thenReturn(Optional.empty());
        when(recommendationRepository.findAllByAgentRunIdOrderByCreatedAtDesc(101L)).thenReturn(List.of(rec));
        when(taskRepository.save(any(AgentImplementationTask.class))).thenAnswer(inv -> {
            AgentImplementationTask t = inv.getArgument(0);
            t.setId(901L);
            return t;
        });

        AgentImplementationTaskResponse response = taskService.createTaskForApprovedRun(101L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(901L, response.id());
        assertEquals(101L, response.agentRunId());
        assertEquals(501L, response.recommendationId());
        assertEquals("Review dinner menu options", response.title());
        assertEquals("Evaluate alternate dal and paneer options for Friday dinner.", response.description());
        assertEquals("Dinner satisfaction dropped 15% following repeated dal preparation.", response.reason());
        assertEquals("Dinner", response.target());
        assertEquals(AgentImplementationTaskStatus.OPEN, response.status());
        assertEquals("MESO AI Operations Agent", response.createdBy());
    }

    @Test
    void createTaskForApprovedRun_whenCompleted_createsOpenTask() {
        AgentRun run = new AgentRun();
        setField(run, "id", 102L);
        run.setStatus(AgentRunStatus.COMPLETED);

        AgentRecommendation rec = new AgentRecommendation();
        rec.setId(502L);
        rec.setAgentRunId(102L);
        rec.setRecommendationType("REVIEW_FOOD_ISSUE");
        rec.setTitle("Check oil consistency");
        rec.setDescription("Review cooking oil levels in dinner preparation.");
        rec.setSuggestedTarget("DINNER");

        when(runRepository.findById(102L)).thenReturn(Optional.of(run));
        when(taskRepository.findByAgentRunId(102L)).thenReturn(Optional.empty());
        when(recommendationRepository.findAllByAgentRunIdOrderByCreatedAtDesc(102L)).thenReturn(List.of(rec));
        when(taskRepository.save(any(AgentImplementationTask.class))).thenAnswer(inv -> {
            AgentImplementationTask t = inv.getArgument(0);
            t.setId(902L);
            return t;
        });

        AgentImplementationTaskResponse response = taskService.createTaskForApprovedRun(102L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(AgentImplementationTaskStatus.OPEN, response.status());
        assertEquals("Review food quality and preparation for dinner", response.title());
    }

    @Test
    void createTaskForApprovedRun_whenMenuRepetitionGoal_createsTaskForMenuRotation() {
        AgentRun run = new AgentRun();
        setField(run, "id", 109L);
        run.setStatus(AgentRunStatus.APPROVED);
        run.setGoalType(com.messo.agent.AgentGoalType.MENU_REPETITION_AND_STUDENT_FATIGUE);
        run.setGoalTarget("MENU_ROTATION");

        AgentRecommendation rec = new AgentRecommendation();
        rec.setId(509L);
        rec.setAgentRunId(109L);
        rec.setRecommendationType("REVIEW_MENU_CHANGE");
        rec.setTitle("Review menu rotation");
        rec.setDescription("Review the current menu rotation and consider increasing variety for frequently repeated meal items.");
        rec.setRationale("Analysis indicates menu repetition intervals are contributing to student fatigue.");
        rec.setSuggestedTarget("Menu rotation");

        when(runRepository.findById(109L)).thenReturn(Optional.of(run));
        when(taskRepository.findByAgentRunId(109L)).thenReturn(Optional.empty());
        when(recommendationRepository.findAllByAgentRunIdOrderByCreatedAtDesc(109L)).thenReturn(List.of(rec));
        when(taskRepository.save(any(AgentImplementationTask.class))).thenAnswer(inv -> {
            AgentImplementationTask t = inv.getArgument(0);
            t.setId(909L);
            return t;
        });

        AgentImplementationTaskResponse response = taskService.createTaskForApprovedRun(109L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(909L, response.id());
        assertEquals("Review menu rotation", response.title());
        assertEquals("Menu rotation", response.target());
        assertEquals("Review the current menu rotation and consider increasing variety for frequently repeated meal items.", response.description());
        assertEquals(AgentImplementationTaskStatus.OPEN, response.status());
    }

    @Test
    void createTaskForApprovedRun_whenPending_throwsIllegalStateException() {
        AgentRun run = new AgentRun();
        setField(run, "id", 103L);
        run.setStatus(AgentRunStatus.PENDING);

        when(runRepository.findById(103L)).thenReturn(Optional.of(run));
        when(taskRepository.findByAgentRunId(103L)).thenReturn(Optional.empty());

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> taskService.createTaskForApprovedRun(103L, "admin@messo.com"));
        assertTrue(ex.getMessage().contains("cannot create an implementation task because status is PENDING"));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTaskForApprovedRun_whenRunning_throwsIllegalStateException() {
        AgentRun run = new AgentRun();
        setField(run, "id", 104L);
        run.setStatus(AgentRunStatus.RUNNING);

        when(runRepository.findById(104L)).thenReturn(Optional.of(run));
        when(taskRepository.findByAgentRunId(104L)).thenReturn(Optional.empty());

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> taskService.createTaskForApprovedRun(104L, "admin@messo.com"));
        assertTrue(ex.getMessage().contains("cannot create an implementation task because status is RUNNING"));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTaskForApprovedRun_whenWaitingForApproval_throwsIllegalStateException() {
        AgentRun run = new AgentRun();
        setField(run, "id", 105L);
        run.setStatus(AgentRunStatus.WAITING_FOR_APPROVAL);

        when(runRepository.findById(105L)).thenReturn(Optional.of(run));
        when(taskRepository.findByAgentRunId(105L)).thenReturn(Optional.empty());

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> taskService.createTaskForApprovedRun(105L, "admin@messo.com"));
        assertTrue(ex.getMessage().contains("Only APPROVED runs may produce an implementation task"));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTaskForApprovedRun_whenNoRecommendationExists_throwsIllegalStateException() {
        AgentRun run = new AgentRun();
        setField(run, "id", 106L);
        run.setStatus(AgentRunStatus.APPROVED);

        when(runRepository.findById(106L)).thenReturn(Optional.of(run));
        when(taskRepository.findByAgentRunId(106L)).thenReturn(Optional.empty());
        when(recommendationRepository.findAllByAgentRunIdOrderByCreatedAtDesc(106L)).thenReturn(List.of());

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> taskService.createTaskForApprovedRun(106L, "admin@messo.com"));
        assertTrue(ex.getMessage().contains("no recommendation exists for run 106"));
        verify(taskRepository, never()).save(any());
    }

    // =========================================================================
    // 2. Idempotency & Race Condition Handling
    // =========================================================================

    @Test
    void createTaskForApprovedRun_isIdempotent_returnsExistingTask() {
        AgentRun run = new AgentRun();
        setField(run, "id", 107L);
        run.setStatus(AgentRunStatus.APPROVED);

        AgentImplementationTask existing = new AgentImplementationTask();
        existing.setId(907L);
        existing.setAgentRunId(107L);
        existing.setRecommendationId(507L);
        existing.setTitle("Existing Task");
        existing.setStatus(AgentImplementationTaskStatus.OPEN);

        when(runRepository.findById(107L)).thenReturn(Optional.of(run));
        when(taskRepository.findByAgentRunId(107L)).thenReturn(Optional.of(existing));

        AgentImplementationTaskResponse response = taskService.createTaskForApprovedRun(107L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(907L, response.id());
        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTaskForApprovedRun_onConcurrentRace_recoversExistingTask() {
        AgentRun run = new AgentRun();
        setField(run, "id", 108L);
        run.setStatus(AgentRunStatus.APPROVED);

        AgentRecommendation rec = new AgentRecommendation();
        rec.setId(508L);
        rec.setAgentRunId(108L);
        rec.setRecommendationType("REVIEW_MENU_CHANGE");

        AgentImplementationTask racedTask = new AgentImplementationTask();
        racedTask.setId(908L);
        racedTask.setAgentRunId(108L);
        racedTask.setStatus(AgentImplementationTaskStatus.OPEN);

        when(runRepository.findById(108L)).thenReturn(Optional.of(run));
        // First check: empty, but save triggers unique constraint violation
        when(taskRepository.findByAgentRunId(108L)).thenReturn(Optional.empty()).thenReturn(Optional.of(racedTask));
        when(recommendationRepository.findAllByAgentRunIdOrderByCreatedAtDesc(108L)).thenReturn(List.of(rec));
        when(taskRepository.save(any())).thenThrow(new DataIntegrityViolationException("Unique constraint violation"));

        AgentImplementationTaskResponse response = taskService.createTaskForApprovedRun(108L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(908L, response.id());
    }

    // =========================================================================
    // 3. State Machine Transitions
    // =========================================================================

    @Test
    void startTask_transitionsOpenToInProgress() {
        AgentImplementationTask task = new AgentImplementationTask();
        task.setId(909L);
        task.setStatus(AgentImplementationTaskStatus.OPEN);

        when(taskRepository.findById(909L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AgentImplementationTaskResponse response = taskService.startTask(909L, "operator@messo.com");

        assertEquals(AgentImplementationTaskStatus.IN_PROGRESS, response.status());
    }

    @Test
    void startTask_whenAlreadyInProgress_returnsIdempotentTask() {
        AgentImplementationTask task = new AgentImplementationTask();
        task.setId(910L);
        task.setStatus(AgentImplementationTaskStatus.IN_PROGRESS);

        when(taskRepository.findById(910L)).thenReturn(Optional.of(task));

        AgentImplementationTaskResponse response = taskService.startTask(910L, "operator@messo.com");

        assertEquals(AgentImplementationTaskStatus.IN_PROGRESS, response.status());
        verify(taskRepository, never()).save(any());
    }

    @Test
    void completeTask_transitionsInProgressToCompleted() {
        AgentImplementationTask task = new AgentImplementationTask();
        task.setId(911L);
        task.setStatus(AgentImplementationTaskStatus.IN_PROGRESS);

        when(taskRepository.findById(911L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AgentImplementationTaskResponse response = taskService.completeTask(911L, "operator@messo.com");

        assertEquals(AgentImplementationTaskStatus.COMPLETED, response.status());
        assertEquals("operator@messo.com", response.completedBy());
        assertNotNull(response.completedAt());
    }

    @Test
    void completeTask_whenAlreadyCompleted_returnsIdempotentTask() {
        AgentImplementationTask task = new AgentImplementationTask();
        task.setId(912L);
        task.setStatus(AgentImplementationTaskStatus.COMPLETED);
        task.setCompletedBy("prior_admin@messo.com");

        when(taskRepository.findById(912L)).thenReturn(Optional.of(task));

        AgentImplementationTaskResponse response = taskService.completeTask(912L, "operator@messo.com");

        assertEquals(AgentImplementationTaskStatus.COMPLETED, response.status());
        assertEquals("prior_admin@messo.com", response.completedBy());
        verify(taskRepository, never()).save(any());
    }

    @Test
    void cancelTask_transitionsOpenToCancelled() {
        AgentImplementationTask task = new AgentImplementationTask();
        task.setId(913L);
        task.setStatus(AgentImplementationTaskStatus.OPEN);

        when(taskRepository.findById(913L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AgentImplementationTaskResponse response = taskService.cancelTask(913L, "admin@messo.com", "No longer required");

        assertEquals(AgentImplementationTaskStatus.CANCELLED, response.status());
    }

    // =========================================================================
    // 4. Terminal State Protection (Cannot Restart or Mutate Completed/Cancelled)
    // =========================================================================

    @Test
    void startTask_whenCompleted_throwsIllegalStateException() {
        AgentImplementationTask task = new AgentImplementationTask();
        task.setId(914L);
        task.setStatus(AgentImplementationTaskStatus.COMPLETED);

        when(taskRepository.findById(914L)).thenReturn(Optional.of(task));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> taskService.startTask(914L, "admin@messo.com"));
        assertTrue(ex.getMessage().contains("has already been COMPLETED and cannot be restarted"));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void cancelTask_whenCompleted_throwsIllegalStateException() {
        AgentImplementationTask task = new AgentImplementationTask();
        task.setId(915L);
        task.setStatus(AgentImplementationTaskStatus.COMPLETED);

        when(taskRepository.findById(915L)).thenReturn(Optional.of(task));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> taskService.cancelTask(915L, "admin@messo.com", "Try cancel"));
        assertTrue(ex.getMessage().contains("has already been COMPLETED and cannot be cancelled"));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void startTask_whenCancelled_throwsIllegalStateException() {
        AgentImplementationTask task = new AgentImplementationTask();
        task.setId(916L);
        task.setStatus(AgentImplementationTaskStatus.CANCELLED);

        when(taskRepository.findById(916L)).thenReturn(Optional.of(task));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> taskService.startTask(916L, "admin@messo.com"));
        assertTrue(ex.getMessage().contains("has been CANCELLED and cannot be restarted"));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void completeTask_whenCancelled_throwsIllegalStateException() {
        AgentImplementationTask task = new AgentImplementationTask();
        task.setId(917L);
        task.setStatus(AgentImplementationTaskStatus.CANCELLED);

        when(taskRepository.findById(917L)).thenReturn(Optional.of(task));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> taskService.completeTask(917L, "admin@messo.com"));
        assertTrue(ex.getMessage().contains("has been CANCELLED and cannot be completed"));
        verify(taskRepository, never()).save(any());
    }

    // =========================================================================
    // Phase 8: Action Execution & Ready For Verification Lifecycle
    // =========================================================================

    @Test
    void recordActionExecutionOnTask_transitionsStatusToReadyForVerification_andRecordsAuditValues() {
        AgentImplementationTask task = new AgentImplementationTask();
        task.setId(950L);
        task.setStatus(AgentImplementationTaskStatus.OPEN);

        when(taskRepository.findById(950L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(AgentImplementationTask.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = taskService.recordActionExecutionOnTask(
                950L,
                "UPDATE_MENU",
                "Aloo Gobi",
                "Paneer Bhurji",
                java.time.LocalDate.of(2026, 10, 7),
                "DINNER",
                "MESO AI Operations Agent"
        );

        assertNotNull(response);
        assertEquals(AgentImplementationTaskStatus.READY_FOR_VERIFICATION, response.status());
        assertEquals("UPDATE_MENU", response.actionType());
        assertEquals("Aloo Gobi", response.beforeValue());
        assertEquals("Paneer Bhurji", response.afterValue());
        assertEquals(java.time.LocalDate.of(2026, 10, 7), response.targetDate());
        assertEquals("DINNER", response.mealType());
        assertEquals("MESO AI Operations Agent", response.executedBy());
        assertNotNull(response.executedAt());

        // Verify entity state saved
        ArgumentCaptor<AgentImplementationTask> captor = ArgumentCaptor.forClass(AgentImplementationTask.class);
        verify(taskRepository).save(captor.capture());
        assertEquals(AgentImplementationTaskStatus.READY_FOR_VERIFICATION, captor.getValue().getStatus());
        assertEquals("Aloo Gobi", captor.getValue().getBeforeValue());
        assertEquals("Paneer Bhurji", captor.getValue().getAfterValue());
    }

    @Test
    void completeTask_whenReadyForVerification_transitionsToCompleted_withAdminEmail() {
        AgentImplementationTask task = new AgentImplementationTask();
        task.setId(951L);
        task.setStatus(AgentImplementationTaskStatus.READY_FOR_VERIFICATION);
        task.setActionType("UPDATE_MENU");
        task.setBeforeValue("Aloo Gobi");
        task.setAfterValue("Paneer Bhurji");

        when(taskRepository.findById(951L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(AgentImplementationTask.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = taskService.completeTask(951L, "admin@messo.com");

        assertNotNull(response);
        assertEquals(AgentImplementationTaskStatus.COMPLETED, response.status());
        assertEquals("admin@messo.com", response.completedBy());
        assertNotNull(response.completedAt());
        assertEquals("Aloo Gobi", response.beforeValue());
        assertEquals("Paneer Bhurji", response.afterValue());
    }

    @Test
    void cancelTask_whenReadyForVerification_transitionsToCancelled() {
        AgentImplementationTask task = new AgentImplementationTask();
        task.setId(952L);
        task.setStatus(AgentImplementationTaskStatus.READY_FOR_VERIFICATION);

        when(taskRepository.findById(952L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(AgentImplementationTask.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = taskService.cancelTask(952L, "admin@messo.com", "Change discarded by admin");

        assertNotNull(response);
        assertEquals(AgentImplementationTaskStatus.CANCELLED, response.status());
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
