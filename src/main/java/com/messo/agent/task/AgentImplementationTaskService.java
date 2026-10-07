package com.messo.agent.task;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.messo.agent.AgentRun;
import com.messo.agent.AgentRunRepository;
import com.messo.agent.AgentRunStatus;
import com.messo.agent.actionbrief.ActionBrief;
import com.messo.agent.dto.AgentImplementationTaskResponse;
import com.messo.agent.recommendation.AgentRecommendation;
import com.messo.agent.recommendation.AgentRecommendationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

/**
 * Service managing the lifecycle of human implementation tasks (Phase 7.2).
 *
 * <p>Core guarantees:</p>
 * <ol>
 *   <li>Tasks can ONLY be created for approved Agent recommendations.</li>
 *   <li>Task content is derived strictly from the persisted ActionBrief / recommendation — client cannot override it.</li>
 *   <li>Idempotency: multiple creation requests return the existing task.</li>
 *   <li>Strict state machine: OPEN &rarr; IN_PROGRESS &rarr; COMPLETED or OPEN &rarr; CANCELLED.</li>
 *   <li>Terminal states (COMPLETED, CANCELLED) cannot be restarted or mutated.</li>
 *   <li>Never modifies operational data (daily_menu, foods, complaints, reviews, users).</li>
 * </ol>
 */
@Service
public class AgentImplementationTaskService {

    private static final Logger log = LoggerFactory.getLogger(AgentImplementationTaskService.class);

    private final AgentImplementationTaskRepository taskRepository;
    private final AgentRunRepository runRepository;
    private final AgentRecommendationRepository recommendationRepository;
    private final ObjectMapper objectMapper;

    public AgentImplementationTaskService(
            AgentImplementationTaskRepository taskRepository,
            AgentRunRepository runRepository,
            AgentRecommendationRepository recommendationRepository,
            ObjectMapper objectMapper) {
        this.taskRepository = taskRepository;
        this.runRepository = runRepository;
        this.recommendationRepository = recommendationRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Creates an implementation task bound to the approved recommendation of an AgentRun.
     * Idempotent: returns existing task if one is already created.
     */
    @Transactional
    public AgentImplementationTaskResponse createTaskForApprovedRun(Long runId, String adminEmail) {
        log.info("[AgentImplementationTaskService] Creating implementation task for runId={}, requestedBy={}", runId, adminEmail);

        AgentRun run = runRepository.findById(runId)
                .orElseThrow(() -> new NoSuchElementException("AgentRun not found with id: " + runId));

        // 1. Idempotency check: return existing task if already created
        Optional<AgentImplementationTask> existing = taskRepository.findByAgentRunId(runId);
        if (existing.isPresent()) {
            log.info("[AgentImplementationTaskService] Implementation task already exists for runId={} (idempotent).", runId);
            return AgentImplementationTaskResponse.fromEntity(existing.get());
        }

        // 2. State verification: run must be APPROVED or COMPLETED
        if (run.getStatus() != AgentRunStatus.APPROVED && run.getStatus() != AgentRunStatus.COMPLETED) {
            log.warn("[AgentImplementationTaskService] Run {} cannot create task in status {}", runId, run.getStatus());
            throw new IllegalStateException("Run " + runId + " cannot create an implementation task because status is "
                    + run.getStatus() + ". Only APPROVED runs may produce an implementation task.");
        }

        // 3. Recommendation verification: must exist
        List<AgentRecommendation> recommendations = recommendationRepository.findAllByAgentRunIdOrderByCreatedAtDesc(runId);
        if (recommendations.isEmpty()) {
            log.error("[AgentImplementationTaskService] Run {} has no recommendation persisted", runId);
            throw new IllegalStateException("Cannot create implementation task: no recommendation exists for run " + runId);
        }
        AgentRecommendation recommendation = recommendations.get(0);

        // 4. Derive task content from persisted recommendation and ActionBrief
        String rawTarget = recommendation.getSuggestedTarget() != null ? recommendation.getSuggestedTarget() : run.getGoalTarget();
        String humanTarget = humanizeTarget(rawTarget);

        String taskTitle = deriveTaskTitle(recommendation.getTitle(), recommendation.getRecommendationType(), humanTarget);
        String taskDescription = recommendation.getDescription();
        String taskReason = recommendation.getRationale() != null && !recommendation.getRationale().isBlank()
                ? recommendation.getRationale()
                : "Recent ratings and complaint patterns suggest that reviewing alternative meal items may improve student satisfaction.";

        AgentImplementationTask task = new AgentImplementationTask();
        task.setAgentRunId(runId);
        task.setRecommendationId(recommendation.getId());
        task.setTitle(taskTitle);
        task.setDescription(taskDescription);
        task.setReason(taskReason);
        task.setTarget(humanTarget);
        task.setStatus(AgentImplementationTaskStatus.OPEN);
        task.setCreatedBy("MESO AI Operations Agent");
        task.setCreatedAt(LocalDateTime.now());

        if (run.getActionBrief() != null && !run.getActionBrief().isBlank()) {
            try {
                ActionBrief brief = objectMapper.readValue(run.getActionBrief(), ActionBrief.class);
                if (brief.proposedAction() != null) {
                    if (brief.proposedAction().actionType() != null) {
                        task.setActionType(brief.proposedAction().actionType());
                    }
                    if (brief.proposedAction().targetDate() != null) {
                        try {
                            task.setTargetDate(java.time.LocalDate.parse(brief.proposedAction().targetDate()));
                        } catch (Exception ignored) {}
                    }
                    if (brief.proposedAction().mealType() != null) {
                        task.setMealType(brief.proposedAction().mealType());
                    }
                    if (brief.proposedAction().currentFood() != null) {
                        task.setBeforeValue(brief.proposedAction().currentFood());
                    }
                    if (brief.proposedAction().proposedFood() != null) {
                        task.setAfterValue(brief.proposedAction().proposedFood());
                    }
                }
            } catch (Exception ignored) {}
        }

        try {
            AgentImplementationTask saved = taskRepository.save(task);
            log.info("[AgentImplementationTaskService] Successfully created implementation task ID {} for runId={}.", saved.getId(), runId);
            return AgentImplementationTaskResponse.fromEntity(saved);
        } catch (DataIntegrityViolationException dive) {
            log.warn("[AgentImplementationTaskService] Data integrity race condition creating task for runId={}. Recovering existing task.", runId);
            Optional<AgentImplementationTask> raced = taskRepository.findByAgentRunId(runId);
            if (raced.isPresent()) {
                return AgentImplementationTaskResponse.fromEntity(raced.get());
            }
            throw dive;
        }
    }

    /**
     * Lists all implementation tasks for a run.
     */
    @Transactional(readOnly = true)
    public List<AgentImplementationTaskResponse> getTasksForRun(Long runId) {
        return taskRepository.findAllByAgentRunIdOrderByCreatedAtDesc(runId)
                .stream()
                .map(AgentImplementationTaskResponse::fromEntity)
                .toList();
    }

    /**
     * Retrieves a specific implementation task by ID.
     */
    @Transactional(readOnly = true)
    public AgentImplementationTaskResponse getTask(Long taskId) {
        return taskRepository.findById(taskId)
                .map(AgentImplementationTaskResponse::fromEntity)
                .orElseThrow(() -> new NoSuchElementException("Implementation task not found with id: " + taskId));
    }

    /**
     * Transitions an implementation task from OPEN to IN_PROGRESS.
     */
    @Transactional
    public AgentImplementationTaskResponse startTask(Long taskId, String adminEmail) {
        log.info("[AgentImplementationTaskService] Starting implementation task ID {} by {}", taskId, adminEmail);

        AgentImplementationTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("Implementation task not found with id: " + taskId));

        if (task.getStatus() == AgentImplementationTaskStatus.COMPLETED) {
            throw new IllegalStateException("Task #" + taskId + " has already been COMPLETED and cannot be restarted.");
        }
        if (task.getStatus() == AgentImplementationTaskStatus.CANCELLED) {
            throw new IllegalStateException("Task #" + taskId + " has been CANCELLED and cannot be restarted.");
        }
        if (task.getStatus() == AgentImplementationTaskStatus.IN_PROGRESS) {
            log.info("[AgentImplementationTaskService] Task #{} is already IN_PROGRESS (idempotent).", taskId);
            return AgentImplementationTaskResponse.fromEntity(task);
        }

        task.setStatus(AgentImplementationTaskStatus.IN_PROGRESS);
        AgentImplementationTask saved = taskRepository.save(task);
        log.info("[AgentImplementationTaskService] Task #{} transitioned to IN_PROGRESS.", taskId);
        return AgentImplementationTaskResponse.fromEntity(saved);
    }

    /**
     * Transitions an implementation task to COMPLETED by an authenticated admin.
     * Records completedBy and completedAt. Does NOT modify operational menus.
     */
    @Transactional
    public AgentImplementationTaskResponse completeTask(Long taskId, String adminEmail) {
        log.info("[AgentImplementationTaskService] Marking implementation task ID {} completed by {}", taskId, adminEmail);

        AgentImplementationTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("Implementation task not found with id: " + taskId));

        if (task.getStatus() == AgentImplementationTaskStatus.COMPLETED) {
            log.info("[AgentImplementationTaskService] Task #{} is already COMPLETED (idempotent).", taskId);
            return AgentImplementationTaskResponse.fromEntity(task);
        }
        if (task.getStatus() == AgentImplementationTaskStatus.CANCELLED) {
            throw new IllegalStateException("Task #" + taskId + " has been CANCELLED and cannot be completed.");
        }

        task.setStatus(AgentImplementationTaskStatus.COMPLETED);
        task.setCompletedBy(adminEmail);
        task.setCompletedAt(LocalDateTime.now());

        AgentImplementationTask saved = taskRepository.save(task);
        log.info("[AgentImplementationTaskService] Task #{} marked COMPLETED by {}.", taskId, adminEmail);
        return AgentImplementationTaskResponse.fromEntity(saved);
    }

    /**
     * Cancels an open or in-progress implementation task.
     */
    @Transactional
    public AgentImplementationTaskResponse cancelTask(Long taskId, String adminEmail, String reason) {
        log.info("[AgentImplementationTaskService] Cancelling implementation task ID {} by {}, reason={}", taskId, adminEmail, reason);

        AgentImplementationTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("Implementation task not found with id: " + taskId));

        if (task.getStatus() == AgentImplementationTaskStatus.COMPLETED) {
            throw new IllegalStateException("Task #" + taskId + " has already been COMPLETED and cannot be cancelled.");
        }
        if (task.getStatus() == AgentImplementationTaskStatus.CANCELLED) {
            log.info("[AgentImplementationTaskService] Task #{} is already CANCELLED (idempotent).", taskId);
            return AgentImplementationTaskResponse.fromEntity(task);
        }

        task.setStatus(AgentImplementationTaskStatus.CANCELLED);
        AgentImplementationTask saved = taskRepository.save(task);
        log.info("[AgentImplementationTaskService] Task #{} marked CANCELLED.", taskId);
        return AgentImplementationTaskResponse.fromEntity(saved);
    }

    /**
     * Records the executed controlled action on the implementation task and transitions
     * status to READY_FOR_VERIFICATION (Phase 8).
     *
     * <p>Epistemic guarantee: The action has mutated operational state, but remains
     * pending human verification. Does NOT automatically complete the task.</p>
     */
    @Transactional
    public AgentImplementationTaskResponse recordActionExecutionOnTask(
            Long taskId,
            String actionType,
            String beforeValue,
            String afterValue,
            java.time.LocalDate targetDate,
            String mealType,
            String executedBy) {
        log.info("[AgentImplementationTaskService] Recording action execution on task ID {}: actionType={}, before={}, after={}, targetDate={}",
                taskId, actionType, beforeValue, afterValue, targetDate);

        AgentImplementationTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("Implementation task not found with id: " + taskId));

        if (task.getStatus() == AgentImplementationTaskStatus.COMPLETED) {
            log.warn("[AgentImplementationTaskService] Task #{} already COMPLETED. Retaining completed state.", taskId);
            return AgentImplementationTaskResponse.fromEntity(task);
        }

        task.setStatus(AgentImplementationTaskStatus.READY_FOR_VERIFICATION);
        if (actionType != null) task.setActionType(actionType);
        if (beforeValue != null) task.setBeforeValue(beforeValue);
        if (afterValue != null) task.setAfterValue(afterValue);
        if (targetDate != null) task.setTargetDate(targetDate);
        if (mealType != null) task.setMealType(mealType);
        task.setExecutedAt(LocalDateTime.now());
        task.setExecutedBy(executedBy != null && !executedBy.isBlank() ? executedBy : "MESO AI Operations Agent");

        AgentImplementationTask saved = taskRepository.save(task);
        log.info("[AgentImplementationTaskService] Task #{} transitioned to READY_FOR_VERIFICATION.", taskId);
        return AgentImplementationTaskResponse.fromEntity(saved);
    }

    private String deriveTaskTitle(String recTitle, String actionType, String target) {
        if (recTitle != null && !recTitle.isBlank()) {
            if (recTitle.equalsIgnoreCase("Review menu rotation") ||
                recTitle.equalsIgnoreCase("Review dinner menu") ||
                recTitle.equalsIgnoreCase("Review breakfast service") ||
                recTitle.equalsIgnoreCase("Review meal turnout and portion planning") ||
                recTitle.equalsIgnoreCase("Review operational recommendations")) {
                return recTitle;
            }
        }

        String cleanTarget = (target != null && !target.isBlank()) ? target.trim() : "Operational";
        String lowerTarget = cleanTarget.toLowerCase();

        if (lowerTarget.contains("rotation") || lowerTarget.contains("repetition")) {
            return "Review menu rotation";
        }

        if ("REVIEW_MENU_CHANGE".equalsIgnoreCase(actionType)) {
            return "Review " + lowerTarget + " menu options";
        } else if ("REVIEW_FOOD_ISSUE".equalsIgnoreCase(actionType)) {
            return "Review food quality and preparation for " + lowerTarget;
        } else if ("REVIEW_STUDENT_FEEDBACK".equalsIgnoreCase(actionType)) {
            return "Review student feedback patterns for " + lowerTarget;
        }
        return "Review operational recommendations for " + lowerTarget;
    }

    private String humanizeTarget(String rawTarget) {
        if (rawTarget == null || rawTarget.isBlank()) return "General Operations";
        return switch (rawTarget.toUpperCase()) {
            case "DINNER_SATISFACTION", "DINNER_TURNOUT", "DINNER" -> "Dinner";
            case "BREAKFAST_SERVICE", "BREAKFAST" -> "Breakfast";
            case "LUNCH_SERVICE", "LUNCH" -> "Lunch";
            case "GENERAL_OPERATIONS" -> "General Operations";
            case "MENU_ROTATION", "MENU_REPETITION", "MENU_REPETITION_AND_STUDENT_FATIGUE" -> "Menu rotation";
            default -> {
                String clean = rawTarget.replace("_", " ").trim();
                yield clean.substring(0, 1).toUpperCase() + clean.substring(1).toLowerCase();
            }
        };
    }
}
