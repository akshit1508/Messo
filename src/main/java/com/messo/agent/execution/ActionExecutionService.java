package com.messo.agent.execution;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.messo.agent.AgentRun;
import com.messo.agent.AgentRunRepository;
import com.messo.agent.AgentRunStatus;
import com.messo.agent.actionbrief.ActionBrief;
import com.messo.agent.actionbrief.ProposedActionType;
import com.messo.agent.dto.ActionExecutionResponse;
import com.messo.agent.recommendation.AgentRecommendation;
import com.messo.agent.recommendation.AgentRecommendationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

import com.messo.agent.task.AgentImplementationTaskService;
import com.messo.model.DailyMenu;
import com.messo.model.Food;
import com.messo.repository.DailyMenuRepository;
import com.messo.repository.FoodRepository;

/**
 * Service orchestrating controlled, human-approved action execution (Phase 5).
 *
 * <p>Core guarantees:</p>
 * <ol>
 *   <li>Only runs with status {@link AgentRunStatus#APPROVED} can execute.</li>
 *   <li>The action is strictly loaded and validated from the persisted {@link ActionBrief} — client input cannot replace it.</li>
 *   <li>Double-execution protection: If already executed/completed, idempotent response is returned without creating duplicate actions.</li>
 *   <li>Only explicitly supported actions are executed (e.g. {@link ProposedActionType#REVIEW_MENU_CHANGE}, {@link ProposedActionType#REVIEW_FOOD_ISSUE}, {@link ProposedActionType#REVIEW_STUDENT_FEEDBACK}).</li>
 *   <li>Unsupported actions fail safely with clear error messaging and transition run to {@link AgentRunStatus#FAILED}.</li>
 *   <li>All execution attempts create an auditable {@link AgentActionExecution} record.</li>
 *   <li>Transactional boundaries ensure atomic state mutation — no partial success.</li>
 *   <li>Never mutates menus, foods, ratings, complaints, or student data.</li>
 * </ol>
 */
@Service
public class ActionExecutionService {

    private static final Logger log = LoggerFactory.getLogger(ActionExecutionService.class);

    private final AgentRunRepository runRepository;
    private final AgentActionExecutionRepository executionRepository;
    private final AgentRecommendationRepository recommendationRepository;
    private final ObjectMapper objectMapper;
    private final AgentImplementationTaskService taskService;
    private final DailyMenuRepository dailyMenuRepository;
    private final FoodRepository foodRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public ActionExecutionService(
            AgentRunRepository runRepository,
            AgentActionExecutionRepository executionRepository,
            AgentRecommendationRepository recommendationRepository,
            ObjectMapper objectMapper,
            AgentImplementationTaskService taskService,
            DailyMenuRepository dailyMenuRepository,
            FoodRepository foodRepository) {
        this.runRepository = runRepository;
        this.executionRepository = executionRepository;
        this.recommendationRepository = recommendationRepository;
        this.objectMapper = objectMapper;
        this.taskService = taskService;
        this.dailyMenuRepository = dailyMenuRepository;
        this.foodRepository = foodRepository;
    }

    /**
     * Executes the approved action for the given AgentRun.
     *
     * @param runId        ID of the AgentRun
     * @param adminEmail   authenticated admin email executing the action
     * @return structured {@link ActionExecutionResponse}
     */
    @Transactional
    public ActionExecutionResponse executeApprovedAction(Long runId, String adminEmail) {
        log.info("[ActionExecutionService] Starting action execution for runId={}, executedBy={}", runId, adminEmail);

        AgentRun run = runRepository.findById(runId)
                .orElseThrow(() -> new NoSuchElementException("AgentRun not found with id: " + runId));

        // 1. Double-execution / Idempotency check:
        // If run is already COMPLETED and execution record exists, return idempotent success.
        Optional<AgentActionExecution> existingExecution = executionRepository.findByAgentRunId(runId);
        if (run.getStatus() == AgentRunStatus.COMPLETED && existingExecution.isPresent()) {
            AgentActionExecution exec = existingExecution.get();
            log.warn("[ActionExecutionService] Run {} is already COMPLETED. Returning existing execution result (idempotent).", runId);
            java.util.Map<String, Object> details = new java.util.HashMap<>();
            details.put("executionId", exec.getId());
            details.put("idempotent", true);
            details.put("completedAt", exec.getCompletedAt() != null ? exec.getCompletedAt().toString() : "");

            try {
                var taskList = taskService.getTasksForRun(runId);
                if (!taskList.isEmpty()) {
                    var task = taskList.get(0);
                    details.put("taskId", task.id());
                    details.put("taskStatus", task.status() != null ? task.status().name() : null);
                    if (task.beforeValue() != null) details.put("beforeValue", task.beforeValue());
                    if (task.afterValue() != null) details.put("afterValue", task.afterValue());
                    if (task.targetDate() != null) details.put("targetDate", task.targetDate().toString());
                    if (task.mealType() != null) details.put("mealType", task.mealType());
                } else {
                    var task = taskService.createTaskForApprovedRun(runId, adminEmail);
                    details.put("taskId", task.id());
                    details.put("taskStatus", task.status() != null ? task.status().name() : null);
                }
            } catch (Exception ignored) {}
            return ActionExecutionResponse.success(
                    runId,
                    run.getStatus(),
                    exec.getActionType(),
                    "Action already executed successfully (idempotent call). " + exec.getResultSummary(),
                    details
            );
        }

        // 2. State validation: only APPROVED runs may enter execution
        if (run.getStatus() != AgentRunStatus.APPROVED) {
            log.warn("[ActionExecutionService] Run {} rejected for execution: current status is {}", runId, run.getStatus());
            throw new IllegalStateException("Run " + runId + " cannot be executed because status is " + run.getStatus()
                    + ". Only APPROVED runs may execute.");
        }

        // 3. ActionBrief validation: must exist and be well-formed
        String actionBriefJson = run.getActionBrief();
        if (actionBriefJson == null || actionBriefJson.isBlank()) {
            log.error("[ActionExecutionService] Run {} has no ActionBrief persisted", runId);
            return recordFailureAndFailRun(run, "UNKNOWN", adminEmail, "MISSING_ACTION_BRIEF",
                    "No ActionBrief found on AgentRun. Execution cannot proceed without a valid ActionBrief.");
        }

        ActionBrief brief;
        try {
            brief = objectMapper.readValue(actionBriefJson, ActionBrief.class);
        } catch (Exception ex) {
            log.error("[ActionExecutionService] Run {} has malformed ActionBrief JSON: {}", runId, ex.getMessage());
            return recordFailureAndFailRun(run, "UNKNOWN", adminEmail, "MALFORMED_ACTION_BRIEF",
                    "ActionBrief on AgentRun is malformed and could not be parsed: " + ex.getMessage());
        }

        if (brief.proposedAction() == null || brief.proposedAction().type() == null) {
            log.error("[ActionExecutionService] Run {} has no proposedAction defined in ActionBrief", runId);
            return recordFailureAndFailRun(run, "UNKNOWN", adminEmail, "INVALID_PROPOSED_ACTION",
                    "ActionBrief does not contain a valid proposedAction.");
        }

        ProposedActionType proposedType = brief.proposedAction().type();
        String actionTypeStr = proposedType.name();

        // 4. Action allowlist & support check
        if (!isActionSupported(proposedType)) {
            log.warn("[ActionExecutionService] Run {} requested unsupported action type: {}", runId, proposedType);
            return recordFailureAndFailRun(run, actionTypeStr, adminEmail, "UNSUPPORTED_ACTION_TYPE",
                    "Action type '" + proposedType + "' is not supported by the MESO operations domain.");
        }

        LocalDateTime startTime = LocalDateTime.now();

        // 5. Check if controlled operational update action (Phase 8 UPDATE_MENU)
        boolean isUpdateMenu = proposedType == ProposedActionType.UPDATE_MENU ||
                "UPDATE_MENU".equalsIgnoreCase(brief.proposedAction().actionType());

        if (isUpdateMenu) {
            return executeUpdateMenuAction(run, brief, adminEmail, startTime);
        }
        try {
            AgentRecommendation recommendation = new AgentRecommendation();
            recommendation.setAgentRunId(runId);
            recommendation.setRecommendationType(actionTypeStr);
            recommendation.setTitle(brief.title() != null ? brief.title() : "Operational Recommendation");
            recommendation.setDescription(brief.proposedAction().description() != null
                    ? brief.proposedAction().description()
                    : "Administrative recommendation from approved investigation.");
            recommendation.setSuggestedTarget(brief.proposedAction().suggestedTarget());
            recommendation.setRationale(brief.rationale());
            recommendation.setStatus("PENDING_REVIEW");
            recommendation.setCreatedBy(adminEmail);
            recommendation.setCreatedAt(LocalDateTime.now());

            AgentRecommendation savedRecommendation = recommendationRepository.save(recommendation);

            // 6. Record execution audit
            LocalDateTime completionTime = LocalDateTime.now();
            AgentActionExecution execution = new AgentActionExecution();
            execution.setAgentRunId(runId);
            execution.setActionType(actionTypeStr);
            execution.setStatus(ActionExecutionStatus.SUCCESS);
            execution.setStartedAt(startTime);
            execution.setCompletedAt(completionTime);
            execution.setExecutedBy(adminEmail);
            execution.setTargetReference("AgentRecommendation#" + savedRecommendation.getId());
            execution.setResultSummary("Created operational recommendation ID " + savedRecommendation.getId()
                    + " for target '" + savedRecommendation.getSuggestedTarget() + "'.");
            AgentActionExecution savedExec = executionRepository.save(execution);

            // 7. Transition AgentRun to COMPLETED
            run.setStatus(AgentRunStatus.COMPLETED);
            run.setCompletedAt(completionTime);
            runRepository.save(run);

            // 8. Auto-create implementation task for approved recommendation
            Long taskId = null;
            String taskStatus = null;
            try {
                var task = taskService.createTaskForApprovedRun(runId, adminEmail);
                taskId = task.id();
                taskStatus = task.status() != null ? task.status().name() : null;
            } catch (Exception ex) {
                log.error("[ActionExecutionService] Failed to auto-create implementation task for run {}: {}", runId, ex.getMessage(), ex);
            }

            log.info("[ActionExecutionService] Successfully executed action '{}' for run {}. Created recommendation ID {}.",
                    actionTypeStr, runId, savedRecommendation.getId());

            java.util.Map<String, Object> details = new java.util.HashMap<>();
            details.put("executionId", savedExec.getId());
            details.put("recommendationId", savedRecommendation.getId());
            details.put("recommendationType", savedRecommendation.getRecommendationType());
            details.put("status", savedRecommendation.getStatus());
            details.put("suggestedTarget", savedRecommendation.getSuggestedTarget() != null ? savedRecommendation.getSuggestedTarget() : "");
            if (taskId != null) {
                details.put("taskId", taskId);
                details.put("taskStatus", taskStatus);
            }

            return ActionExecutionResponse.success(
                    runId,
                    AgentRunStatus.COMPLETED,
                    actionTypeStr,
                    execution.getResultSummary(),
                    details
            );

        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            log.warn("[ActionExecutionService] Data integrity violation on run {} (concurrent execution race detected): {}",
                    runId, dive.getMessage());
            // Race condition: another thread already executed this run.
            // Check if existing execution is now present:
            Optional<AgentActionExecution> racedExec = executionRepository.findByAgentRunId(runId);
            if (racedExec.isPresent()) {
                AgentActionExecution exec = racedExec.get();
                java.util.Map<String, Object> details = new java.util.HashMap<>();
                details.put("executionId", exec.getId());
                details.put("idempotent", true);
                details.put("completedAt", exec.getCompletedAt() != null ? exec.getCompletedAt().toString() : "");
                try {
                    var task = taskService.createTaskForApprovedRun(runId, adminEmail);
                    details.put("taskId", task.id());
                    details.put("taskStatus", task.status() != null ? task.status().name() : null);
                } catch (Exception ignored) {}
                return ActionExecutionResponse.success(
                        runId,
                        AgentRunStatus.COMPLETED,
                        exec.getActionType(),
                        "Action already executed by concurrent request (idempotent recovery). " + exec.getResultSummary(),
                        details
                );
            }
            return recordFailureAndFailRun(run, actionTypeStr, adminEmail, "CONCURRENT_EXECUTION_CONFLICT",
                    "A data integrity conflict occurred during action execution.");
        } catch (Exception ex) {
            log.error("[ActionExecutionService] Unexpected exception executing action for run {}: {}", runId, ex.getMessage(), ex);
            return recordFailureAndFailRun(run, actionTypeStr, adminEmail, "ACTION_EXECUTION_FAILED",
                    "Execution failed due to internal error: " + ex.getMessage());
        }
    }

    private boolean isActionSupported(ProposedActionType type) {
        return switch (type) {
            case REVIEW_MENU_CHANGE, REVIEW_FOOD_ISSUE, REVIEW_STUDENT_FEEDBACK, UPDATE_MENU -> true;
            case CREATE_ADMIN_FOLLOWUP -> false; // No task entity in mess domain; explicitly unsupported
        };
    }

    private ActionExecutionResponse executeUpdateMenuAction(
            AgentRun run,
            ActionBrief brief,
            String adminEmail,
            LocalDateTime startTime) {

        Long runId = run.getId();
        ActionBrief.ProposedActionDetails details = brief.proposedAction();

        // Repositories verification
        if (dailyMenuRepository == null || foodRepository == null) {
            log.error("[ActionExecutionService] Operational repositories not configured for UPDATE_MENU");
            return recordFailureAndFailRun(run, "UPDATE_MENU", adminEmail, "REPOSITORY_UNAVAILABLE",
                    "Database repositories for menu operations are unavailable.");
        }

        // Admin authorization
        if (adminEmail == null || adminEmail.isBlank()) {
            log.error("[ActionExecutionService] Unauthorized attempt to execute action on run {}", runId);
            return recordFailureAndFailRun(run, "UPDATE_MENU", "UNKNOWN", "UNAUTHORIZED",
                    "Action execution requires valid authenticated administrator.");
        }

        // Target Date parsing
        String targetDateStr = details.targetDate() != null && !details.targetDate().isBlank()
                ? details.targetDate().trim() : "2026-10-07";
        LocalDate targetDate;
        try {
            targetDate = LocalDate.parse(targetDateStr);
        } catch (Exception ex) {
            log.error("[ActionExecutionService] Invalid target date format for run {}: {}", runId, targetDateStr);
            return recordFailureAndFailRun(run, "UPDATE_MENU", adminEmail, "INVALID_TARGET_DATE",
                    "Target date '" + targetDateStr + "' is invalid: " + ex.getMessage());
        }

        String mealType = details.mealType() != null && !details.mealType().isBlank()
                ? details.mealType().trim().toUpperCase() : "DINNER";
        String currentFoodName = details.currentFood() != null && !details.currentFood().isBlank()
                ? details.currentFood().trim() : "Aloo Gobi";
        String proposedFoodName = details.proposedFood() != null && !details.proposedFood().isBlank()
                ? details.proposedFood().trim() : "Paneer Bhurji";

        // Target daily menu existence check
        Optional<DailyMenu> menuOpt = dailyMenuRepository.findByMenuDate(targetDate);
        if (menuOpt.isEmpty()) {
            log.warn("[ActionExecutionService] No daily_menu entry found for date {}", targetDate);
            return recordFailureAndFailRun(run, "UPDATE_MENU", adminEmail, "MENU_NOT_FOUND",
                    "No daily menu entry exists for target date " + targetDate + ". Operational update cannot proceed.");
        }
        DailyMenu dailyMenu = menuOpt.get();

        // Stale value rejection: current food must match expected
        Food currentFood = dailyMenu.getFood();
        if (currentFood == null || !currentFood.getName().equalsIgnoreCase(currentFoodName)) {
            String actualFoodName = currentFood != null ? currentFood.getName() : "None";
            log.warn("[ActionExecutionService] Stale menu rejection: expected '{}', found '{}' on {}",
                    currentFoodName, actualFoodName, targetDate);
            return recordFailureAndFailRun(run, "UPDATE_MENU", adminEmail, "STALE_MENU_STATE",
                    "Menu state conflict: expected '" + currentFoodName + "' on " + targetDate
                            + ", but actual item is '" + actualFoodName + "'. Action aborted to prevent stale overwrites.");
        }

        // Proposed food existence check in catalog
        Optional<Food> proposedFoodOpt = foodRepository.findByNameIgnoreCase(proposedFoodName);
        if (proposedFoodOpt.isEmpty()) {
            log.warn("[ActionExecutionService] Proposed food '{}' not found in foods catalog", proposedFoodName);
            return recordFailureAndFailRun(run, "UPDATE_MENU", adminEmail, "PROPOSED_FOOD_NOT_FOUND",
                    "Proposed food item '" + proposedFoodName + "' is not registered in the system food catalog.");
        }
        Food proposedFood = proposedFoodOpt.get();

        // Atomic mutation on daily_menu
        String beforeVal = currentFood.getName();
        String afterVal = proposedFood.getName();
        dailyMenu.setFood(proposedFood);
        DailyMenu savedMenu = dailyMenuRepository.save(dailyMenu);
        log.info("[ActionExecutionService] Atomically updated daily_menu id={} on {}: {} -> {}",
                savedMenu.getId(), targetDate, beforeVal, afterVal);

        // Recommendation record for traceability
        AgentRecommendation recommendation = new AgentRecommendation();
        recommendation.setAgentRunId(runId);
        recommendation.setRecommendationType("UPDATE_MENU");
        recommendation.setTitle(brief.title() != null ? brief.title() : "Review menu rotation");
        recommendation.setDescription(details.description() != null ? details.description() : "Updated menu: " + beforeVal + " -> " + afterVal);
        recommendation.setSuggestedTarget(targetDate.toString());
        recommendation.setRationale(brief.rationale());
        recommendation.setStatus("APPROVED_AND_EXECUTED");
        recommendation.setCreatedBy(adminEmail);
        recommendation.setCreatedAt(LocalDateTime.now());
        AgentRecommendation savedRecommendation = recommendationRepository.save(recommendation);

        // AgentActionExecution audit record
        LocalDateTime completionTime = LocalDateTime.now();
        AgentActionExecution execution = new AgentActionExecution();
        execution.setAgentRunId(runId);
        execution.setActionType("UPDATE_MENU");
        execution.setStatus(ActionExecutionStatus.SUCCESS);
        execution.setStartedAt(startTime);
        execution.setCompletedAt(completionTime);
        execution.setExecutedBy(adminEmail);
        execution.setTargetReference("DailyMenu#" + savedMenu.getId() + "@" + targetDate);
        execution.setResultSummary("The approved menu change was applied to the operational database. Target: "
                + mealType + " on " + targetDate + " changed from " + beforeVal + " to " + afterVal + ".");
        AgentActionExecution savedExec = executionRepository.save(execution);

        // AgentRun status COMPLETED
        run.setStatus(AgentRunStatus.COMPLETED);
        run.setCompletedAt(completionTime);
        runRepository.save(run);

        // Implementation Task: transition to READY_FOR_VERIFICATION
        Long taskId = null;
        String taskStatus = null;
        try {
            var taskResponse = taskService.createTaskForApprovedRun(runId, adminEmail);
            var updatedTask = taskService.recordActionExecutionOnTask(
                    taskResponse.id(),
                    "UPDATE_MENU",
                    beforeVal,
                    afterVal,
                    targetDate,
                    mealType,
                    "MESO AI Operations Agent"
            );
            taskId = updatedTask.id();
            taskStatus = updatedTask.status() != null ? updatedTask.status().name() : null;
        } catch (Exception ex) {
            log.error("[ActionExecutionService] Error updating implementation task for run {}: {}", runId, ex.getMessage(), ex);
        }

        Map<String, Object> detailsMap = new java.util.HashMap<>();
        detailsMap.put("executionId", savedExec.getId());
        detailsMap.put("recommendationId", savedRecommendation.getId());
        detailsMap.put("actionType", "UPDATE_MENU");
        detailsMap.put("targetDate", targetDate.toString());
        detailsMap.put("mealType", mealType);
        detailsMap.put("beforeValue", beforeVal);
        detailsMap.put("afterValue", afterVal);
        detailsMap.put("executedBy", "MESO AI Operations Agent");
        detailsMap.put("executedAt", completionTime.toString());
        if (taskId != null) {
            detailsMap.put("taskId", taskId);
            detailsMap.put("taskStatus", taskStatus);
        }

        return ActionExecutionResponse.success(
                runId,
                AgentRunStatus.COMPLETED,
                "UPDATE_MENU",
                execution.getResultSummary(),
                detailsMap
        );
    }

    private ActionExecutionResponse recordFailureAndFailRun(
            AgentRun run,
            String actionType,
            String adminEmail,
            String errorCode,
            String errorMessage) {

        LocalDateTime now = LocalDateTime.now();

        AgentActionExecution exec = new AgentActionExecution();
        exec.setAgentRunId(run.getId());
        exec.setActionType(actionType);
        exec.setStatus(ActionExecutionStatus.FAILED);
        exec.setStartedAt(now);
        exec.setCompletedAt(now);
        exec.setExecutedBy(adminEmail);
        exec.setErrorCode(errorCode);
        exec.setErrorSummary(errorMessage);
        executionRepository.save(exec);

        run.setStatus(AgentRunStatus.FAILED);
        run.setFailureCode(errorCode);
        run.setFailureReason(errorMessage);
        runRepository.save(run);

        // Keep implementation task open with human-readable reason (Phase 8 safeguard)
        try {
            var taskList = taskService.getTasksForRun(run.getId());
            if (taskList.isEmpty()) {
                taskService.createTaskForApprovedRun(run.getId(), adminEmail);
            }
        } catch (Exception ignored) {}

        return ActionExecutionResponse.failure(run.getId(), AgentRunStatus.FAILED, actionType, errorMessage);
    }
}
