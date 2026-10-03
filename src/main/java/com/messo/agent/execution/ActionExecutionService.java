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

import java.time.LocalDateTime;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

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

    public ActionExecutionService(
            AgentRunRepository runRepository,
            AgentActionExecutionRepository executionRepository,
            AgentRecommendationRepository recommendationRepository,
            ObjectMapper objectMapper) {
        this.runRepository = runRepository;
        this.executionRepository = executionRepository;
        this.recommendationRepository = recommendationRepository;
        this.objectMapper = objectMapper;
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
            return ActionExecutionResponse.success(
                    runId,
                    run.getStatus(),
                    exec.getActionType(),
                    "Action already executed successfully (idempotent call). " + exec.getResultSummary(),
                    Map.of(
                            "executionId", exec.getId(),
                            "idempotent", true,
                            "completedAt", exec.getCompletedAt() != null ? exec.getCompletedAt().toString() : ""
                    )
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
        // SUPPORTED: REVIEW_MENU_CHANGE, REVIEW_FOOD_ISSUE, REVIEW_STUDENT_FEEDBACK -> creates AgentRecommendation
        // UNSUPPORTED: CREATE_ADMIN_FOLLOWUP (Mess operational domain has no task management table; documented as unsupported)
        if (!isActionSupported(proposedType)) {
            log.warn("[ActionExecutionService] Run {} requested unsupported action type: {}", runId, proposedType);
            return recordFailureAndFailRun(run, actionTypeStr, adminEmail, "UNSUPPORTED_ACTION_TYPE",
                    "Action type '" + proposedType + "' is not supported by the MESO operations domain.");
        }

        // 5. Execute supported action: create recommendation record
        LocalDateTime startTime = LocalDateTime.now();
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

            log.info("[ActionExecutionService] Successfully executed action '{}' for run {}. Created recommendation ID {}.",
                    actionTypeStr, runId, savedRecommendation.getId());

            return ActionExecutionResponse.success(
                    runId,
                    AgentRunStatus.COMPLETED,
                    actionTypeStr,
                    execution.getResultSummary(),
                    Map.of(
                            "executionId", savedExec.getId(),
                            "recommendationId", savedRecommendation.getId(),
                            "recommendationType", savedRecommendation.getRecommendationType(),
                            "status", savedRecommendation.getStatus(),
                            "suggestedTarget", savedRecommendation.getSuggestedTarget() != null ? savedRecommendation.getSuggestedTarget() : ""
                    )
            );

        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            log.warn("[ActionExecutionService] Data integrity violation on run {} (concurrent execution race detected): {}",
                    runId, dive.getMessage());
            // Race condition: another thread already executed this run.
            // Check if existing execution is now present:
            Optional<AgentActionExecution> racedExec = executionRepository.findByAgentRunId(runId);
            if (racedExec.isPresent()) {
                AgentActionExecution exec = racedExec.get();
                return ActionExecutionResponse.success(
                        runId,
                        AgentRunStatus.COMPLETED,
                        exec.getActionType(),
                        "Action already executed by concurrent request (idempotent recovery). " + exec.getResultSummary(),
                        Map.of(
                                "executionId", exec.getId(),
                                "idempotent", true,
                                "completedAt", exec.getCompletedAt() != null ? exec.getCompletedAt().toString() : ""
                        )
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
            case REVIEW_MENU_CHANGE, REVIEW_FOOD_ISSUE, REVIEW_STUDENT_FEEDBACK -> true;
            case CREATE_ADMIN_FOLLOWUP -> false; // No task entity in mess domain; explicitly unsupported
        };
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

        return ActionExecutionResponse.failure(run.getId(), AgentRunStatus.FAILED, actionType, errorMessage);
    }
}
