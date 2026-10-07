package com.messo.agent;

import com.messo.agent.dto.AgentRunResponse;
import com.messo.agent.dto.AgentStepResponse;
import com.messo.agent.dto.AgentToolResponse;
import com.messo.agent.dto.CreateAgentRunRequest;
import com.messo.agent.dto.ToolExecutionResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * Service layer for the MESO AI Operations Agent foundation.
 *
 * <h3>Phase 1 responsibilities</h3>
 * <ol>
 *   <li>Create Agent Runs (MANUAL, PENDING state only).</li>
 *   <li>Read Agent Run state and steps.</li>
 *   <li>Expose the tool registry.</li>
 * </ol>
 *
 * <h3>Phase 1 non-responsibilities</h3>
 * <ul>
 *   <li>This service does NOT drive the Agent through its steps.</li>
 *   <li>This service does NOT call Gemini or any LLM.</li>
 *   <li>This service does NOT invoke the WHY / WHAT NEXT / WHAT IF engines.</li>
 *   <li>This service does NOT execute any ACTION tools.</li>
 * </ul>
 *
 * <p>All execution logic belongs to the Agent Planner introduced in Phase 2.</p>
 */
@Service
@Transactional
public class AgentService {

    private static final Logger log = LoggerFactory.getLogger(AgentService.class);

    private final AgentRunRepository runRepository;
    private final AgentStepRepository stepRepository;
    private final AgentToolRegistry toolRegistry;
    private final com.messo.agent.tool.AgentToolExecutor toolExecutor;
    private final com.messo.agent.planner.AgentOrchestratorService orchestratorService;
    private final com.messo.agent.execution.ActionExecutionService actionExecutionService;
    private final com.messo.agent.recommendation.AgentRecommendationRepository recommendationRepository;
    private final com.messo.agent.task.AgentImplementationTaskService taskService;

    public AgentService(AgentRunRepository runRepository,
                        AgentStepRepository stepRepository,
                        AgentToolRegistry toolRegistry,
                        com.messo.agent.tool.AgentToolExecutor toolExecutor,
                        com.messo.agent.planner.AgentOrchestratorService orchestratorService,
                        com.messo.agent.execution.ActionExecutionService actionExecutionService,
                        com.messo.agent.recommendation.AgentRecommendationRepository recommendationRepository,
                        com.messo.agent.task.AgentImplementationTaskService taskService) {
        this.runRepository = runRepository;
        this.stepRepository = stepRepository;
        this.toolRegistry = toolRegistry;
        this.toolExecutor = toolExecutor;
        this.orchestratorService = orchestratorService;
        this.actionExecutionService = actionExecutionService;
        this.recommendationRepository = recommendationRepository;
        this.taskService = taskService;
    }

    // =========================================================================
    // CREATE
    // =========================================================================

    /**
     * Creates a new MANUAL Agent Run in PENDING state.
     *
     * <p>Phase 1: the run is created and persisted. No execution is triggered.</p>
     *
     * @param request      the goal specification provided by the admin
     * @param initiatedBy  the email of the authenticated admin (from Spring Security principal)
     * @return the persisted run as a response DTO
     */
    public AgentRunResponse createRun(CreateAgentRunRequest request, String initiatedBy) {
        AgentRun run = new AgentRun();
        run.setGoalType(request.goalType());
        run.setGoalTarget(request.goalTarget());
        run.setGoalDescription(request.goalDescription());
        run.setTriggerType(AgentTriggerType.MANUAL);
        run.setStatus(AgentRunStatus.PENDING);
        run.setApprovalRequired(false);
        run.setInitiatedBy(initiatedBy);

        AgentRun saved = runRepository.save(run);
        log.info("Agent run created: id={} goalType={} initiatedBy={}", saved.getId(), saved.getGoalType(), initiatedBy);

        return AgentRunResponse.from(saved);
    }

    // =========================================================================
    // READ
    // =========================================================================

    /**
     * Returns a single Agent Run by ID.
     *
     * @throws NoSuchElementException if not found
     */
    @Transactional(readOnly = true)
    public AgentRunResponse getRun(Long id) {
        AgentRun run = findRunOrThrow(id);
        return AgentRunResponse.from(run);
    }

    /**
     * Returns all steps for a given Agent Run, ordered by sequence ascending.
     *
     * @throws NoSuchElementException if the run does not exist
     */
    @Transactional(readOnly = true)
    public List<AgentStepResponse> getStepsForRun(Long runId) {
        // Verify the run exists
        findRunOrThrow(runId);
        return stepRepository.findByRunIdOrderBySequenceOrderAsc(runId)
                .stream()
                .map(AgentStepResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Returns all Agent Runs ordered by creation time descending.
     */
    @Transactional(readOnly = true)
    public List<AgentRunResponse> getAllRuns() {
        return runRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(AgentRunResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Returns recommendations created for a specific Agent Run.
     */
    @Transactional(readOnly = true)
    public List<com.messo.agent.dto.AgentRecommendationResponse> getRecommendationsForRun(Long runId) {
        findRunOrThrow(runId);
        return recommendationRepository.findByAgentRunId(runId)
                .stream()
                .map(com.messo.agent.dto.AgentRecommendationResponse::from)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // TOOL REGISTRY
    // =========================================================================

    /**
     * Returns the full tool registry as a list of response DTOs.
     */
    @Transactional(readOnly = true)
    public List<AgentToolResponse> getAllTools() {
        return toolRegistry.all()
                .stream()
                .map(AgentToolResponse::from)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // TOOL EXECUTION (PHASE 2)
    // =========================================================================

    /**
     * Safely executes a registered tool via AgentToolExecutor.
     * Enforces that ACTION tools cannot execute in Phase 2.
     *
     * @param toolName name of the tool to execute
     * @param params   input parameters (may be null/empty)
     * @return structured ToolExecutionResponse
     */
    public ToolExecutionResponse executeTool(String toolName, java.util.Map<String, String> params) {
        com.messo.agent.tool.input.ToolInput input = com.messo.agent.tool.input.ToolInput.of(params);
        com.messo.agent.tool.result.ToolResult result = toolExecutor.execute(toolName, input);
        return ToolExecutionResponse.from(result);
    }

    // =========================================================================
    // INVESTIGATION ORCHESTRATION (PHASE 3A)
    // =========================================================================

    /**
     * Executes the investigation loop for an existing AgentRun.
     * Transitions run from PENDING -> RUNNING -> COMPLETED/FAILED.
     *
     * @param runId the ID of the run
     * @return the updated AgentRunResponse
     */
    public AgentRunResponse startInvestigation(Long runId) {
        AgentRun completedRun = orchestratorService.runInvestigation(runId);
        return AgentRunResponse.from(completedRun);
    }

    // =========================================================================
    // HUMAN APPROVAL & AUDIT (PHASE 4)
    // =========================================================================

    /**
     * Records human administrator approval for an Action Brief.
     * Transitions run from WAITING_FOR_APPROVAL -> APPROVED.
     * Does NOT execute any action (action execution reserved for Phase 5).
     *
     * @param runId      ID of the run to approve
     * @param adminEmail authenticated admin email
     * @return updated AgentRunResponse
     */
    public AgentRunResponse approveRun(Long runId, String adminEmail) {
        AgentRun run = findRunOrThrow(runId);
        if (run.getStatus() != AgentRunStatus.WAITING_FOR_APPROVAL) {
            throw new IllegalStateException("Run " + runId + " is not waiting for approval (current status: " + run.getStatus() + ")");
        }
        run.setApprovalRequired(false);
        run.setApprovedBy(adminEmail);
        run.setApprovedAt(LocalDateTime.now());
        run.setStatus(AgentRunStatus.APPROVED);
        AgentRun saved = runRepository.save(run);
        log.info("AgentRun {} approved by {}", runId, adminEmail);
        return AgentRunResponse.from(saved);
    }

    /**
     * Records human administrator rejection of an Action Brief.
     * Transitions run from WAITING_FOR_APPROVAL -> CANCELLED.
     *
     * @param runId      ID of the run to reject
     * @param adminEmail authenticated admin email
     * @param reason     optional reason for rejection
     * @return updated AgentRunResponse
     */
    public AgentRunResponse rejectRun(Long runId, String adminEmail, String reason) {
        AgentRun run = findRunOrThrow(runId);
        if (run.getStatus() != AgentRunStatus.WAITING_FOR_APPROVAL) {
            throw new IllegalStateException("Run " + runId + " is not waiting for approval (current status: " + run.getStatus() + ")");
        }
        run.setApprovalRequired(false);
        run.setRejectedBy(adminEmail);
        run.setRejectedAt(LocalDateTime.now());
        run.setRejectionReason(reason != null && !reason.isBlank() ? reason.trim() : "Rejected by operator.");
        run.setStatus(AgentRunStatus.CANCELLED);
        AgentRun saved = runRepository.save(run);
        log.info("AgentRun {} rejected by {}: reason={}", runId, adminEmail, run.getRejectionReason());
        return AgentRunResponse.from(saved);
    }

    // =========================================================================
    // CONTROLLED ACTION EXECUTION (PHASE 5)
    // =========================================================================

    /**
     * Executes the approved action for an AgentRun in APPROVED status.
     *
     * @param runId      ID of the run to execute
     * @param adminEmail authenticated admin email executing the action
     * @return structured ActionExecutionResponse
     */
    public com.messo.agent.dto.ActionExecutionResponse executeApprovedAction(Long runId, String adminEmail) {
        return actionExecutionService.executeApprovedAction(runId, adminEmail);
    }

    // =========================================================================
    // IMPLEMENTATION TASKS (PHASE 7.2)
    // =========================================================================

    /**
     * Lists all implementation tasks for an AgentRun.
     */
    @Transactional(readOnly = true)
    public List<com.messo.agent.dto.AgentImplementationTaskResponse> getTasksForRun(Long runId) {
        findRunOrThrow(runId);
        return taskService.getTasksForRun(runId);
    }

    /**
     * Creates an implementation task for an approved run.
     */
    public com.messo.agent.dto.AgentImplementationTaskResponse createTaskForRun(Long runId, String adminEmail) {
        return taskService.createTaskForApprovedRun(runId, adminEmail);
    }

    /**
     * Retrieves a specific implementation task by ID.
     */
    @Transactional(readOnly = true)
    public com.messo.agent.dto.AgentImplementationTaskResponse getTask(Long taskId) {
        return taskService.getTask(taskId);
    }

    /**
     * Transitions an implementation task from OPEN to IN_PROGRESS.
     */
    public com.messo.agent.dto.AgentImplementationTaskResponse startTask(Long taskId, String adminEmail) {
        return taskService.startTask(taskId, adminEmail);
    }

    /**
     * Transitions an implementation task from IN_PROGRESS to COMPLETED.
     */
    public com.messo.agent.dto.AgentImplementationTaskResponse completeTask(Long taskId, String adminEmail) {
        return taskService.completeTask(taskId, adminEmail);
    }

    /**
     * Transitions an implementation task to CANCELLED.
     */
    public com.messo.agent.dto.AgentImplementationTaskResponse cancelTask(Long taskId, String adminEmail, String reason) {
        return taskService.cancelTask(taskId, adminEmail, reason);
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    private AgentRun findRunOrThrow(Long id) {
        return runRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Agent run not found with id: " + id));
    }
}
