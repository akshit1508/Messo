package com.messo.agent;

import com.messo.agent.dto.AgentRunResponse;
import com.messo.agent.dto.AgentStepResponse;
import com.messo.agent.dto.AgentToolResponse;
import com.messo.agent.dto.CreateAgentRunRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for the MESO AI Operations Agent foundation.
 *
 * <h3>Authorization</h3>
 * All endpoints are under {@code /api/admin/**} and therefore require the
 * {@code ROLE_ADMIN} authority, enforced by {@code SecurityConfig}.
 * No new authentication mechanism is introduced.
 *
 * <h3>CSRF</h3>
 * POST endpoints require a valid CSRF token (same as all other admin API POSTs).
 *
 * <h3>Phase 1 endpoints</h3>
 * <pre>
 *   POST   /api/admin/agent/runs          → create a MANUAL run in PENDING state
 *   GET    /api/admin/agent/runs          → list all runs (newest first)
 *   GET    /api/admin/agent/runs/{id}     → get a specific run by ID
 *   GET    /api/admin/agent/runs/{id}/steps → get ordered steps for a run
 *   GET    /api/admin/agent/tools         → list all registered tool definitions
 * </pre>
 */
@RestController
@RequestMapping("/api/admin/agent")
public class AgentController {

    private final AgentService agentService;

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
    }

    // =========================================================================
    // Agent Runs
    // =========================================================================

    /**
     * Creates a new MANUAL Agent Run in PENDING state.
     *
     * <p>The authenticated admin's email is captured from the Spring Security
     * principal and stored as {@code initiatedBy}.</p>
     *
     * @param request        the goal specification
     * @param authentication injected by Spring Security
     * @return 201 Created with the new run as body
     */
    @PostMapping("/runs")
    public ResponseEntity<AgentRunResponse> createRun(
            @Valid @RequestBody CreateAgentRunRequest request,
            Authentication authentication) {

        String initiatedBy = authentication.getName();
        AgentRunResponse response = agentService.createRun(request, initiatedBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Returns all Agent Runs, ordered by creation time descending.
     *
     * @return 200 OK with list of runs
     */
    @GetMapping("/runs")
    public ResponseEntity<List<AgentRunResponse>> listRuns() {
        return ResponseEntity.ok(agentService.getAllRuns());
    }

    /**
     * Returns a specific Agent Run by ID.
     *
     * @return 200 OK with run details, or 404 if not found
     */
    @GetMapping("/runs/{id}")
    public ResponseEntity<AgentRunResponse> getRun(@PathVariable Long id) {
        return ResponseEntity.ok(agentService.getRun(id));
    }

    /**
     * Returns all steps for a specific Agent Run, ordered by sequence ascending.
     *
     * @return 200 OK with ordered step list, or 404 if run not found
     */
    @GetMapping("/runs/{id}/steps")
    public ResponseEntity<List<AgentStepResponse>> getRunSteps(@PathVariable Long id) {
        return ResponseEntity.ok(agentService.getStepsForRun(id));
    }

    /**
     * Returns recommendations created for a specific Agent Run.
     *
     * @return 200 OK with recommendation list, or 404 if run not found
     */
    @GetMapping("/runs/{id}/recommendations")
    public ResponseEntity<List<com.messo.agent.dto.AgentRecommendationResponse>> getRunRecommendations(@PathVariable Long id) {
        return ResponseEntity.ok(agentService.getRecommendationsForRun(id));
    }

    /**
     * Starts the autonomous investigation loop for an existing AgentRun.
     * Synchronously drives the investigation through the planning engine and tools.
     *
     * @param id ID of the run
     * @return updated AgentRunResponse
     */
    @PostMapping("/runs/{id}/start")
    public ResponseEntity<AgentRunResponse> startInvestigation(@PathVariable Long id) {
        return ResponseEntity.ok(agentService.startInvestigation(id));
    }

    /**
     * Records administrator approval for an Action Brief in WAITING_FOR_APPROVAL status.
     * Does NOT execute the action yet (execution belongs to Phase 5).
     *
     * @param id             ID of the run to approve
     * @param authentication authenticated Spring Security user
     * @return updated AgentRunResponse
     */
    @PostMapping("/runs/{id}/approve")
    public ResponseEntity<AgentRunResponse> approveRun(
            @PathVariable Long id,
            Authentication authentication) {
        String adminEmail = authentication.getName();
        return ResponseEntity.ok(agentService.approveRun(id, adminEmail));
    }

    /**
     * Records administrator rejection for an Action Brief in WAITING_FOR_APPROVAL status.
     * Transitions run to CANCELLED.
     *
     * @param id             ID of the run to reject
     * @param body           optional JSON body with rejection reason
     * @param authentication authenticated Spring Security user
     * @return updated AgentRunResponse
     */
    @PostMapping("/runs/{id}/reject")
    public ResponseEntity<AgentRunResponse> rejectRun(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            Authentication authentication) {
        String adminEmail = authentication.getName();
        String reason = (body != null) ? body.get("reason") : null;
        return ResponseEntity.ok(agentService.rejectRun(id, adminEmail, reason));
    }

    /**
     * Executes the approved action for an AgentRun in APPROVED status (Phase 5).
     *
     * <p>Safety rules:</p>
     * <ul>
     *   <li>Must be authenticated as ROLE_ADMIN (inherited from /api/admin/**)</li>
     *   <li>Must provide valid CSRF token</li>
     *   <li>Loads the persisted ActionBrief from the APPROVED run; client cannot provide a different action payload</li>
     *   <li>Enforces idempotency: repeated execution does not duplicate actions</li>
     * </ul>
     *
     * @param id             ID of the approved run to execute
     * @param authentication authenticated Spring Security user
     * @return updated ActionExecutionResponse
     */
    @PostMapping("/runs/{id}/execute")
    public ResponseEntity<com.messo.agent.dto.ActionExecutionResponse> executeRun(
            @PathVariable Long id,
            Authentication authentication) {
        String adminEmail = authentication.getName();
        return ResponseEntity.ok(agentService.executeApprovedAction(id, adminEmail));
    }

    // =========================================================================
    // Tool Registry
    // =========================================================================

    /**
     * Returns all registered tool definitions with their safety classifications.
     *
     * <p>This endpoint allows the Phase 2 planner UI and integration tests to
     * inspect the available tool vocabulary without executing anything.</p>
     *
     * @return 200 OK with list of tool definitions
     */
    @GetMapping("/tools")
    public ResponseEntity<List<AgentToolResponse>> listTools() {
        return ResponseEntity.ok(agentService.getAllTools());
    }

    /**
     * Executes a registered tool safely under ADMIN authentication.
     *
     * <p>Safety rules:
     * <ul>
     *   <li>Must be authenticated as ROLE_ADMIN (inherited from /api/admin/**)</li>
     *   <li>Must provide valid CSRF token</li>
     *   <li>ACTION tools are rejected immediately</li>
     *   <li>Unknown tool names return a controlled failure response</li>
     *   <li>Never mutates operational data</li>
     * </ul>
     *
     * @param toolName name of the tool to execute
     * @param params   optional input parameters
     * @return 200 OK with ToolExecutionResponse
     */
    @PostMapping("/tools/{toolName}/execute")
    public ResponseEntity<com.messo.agent.dto.ToolExecutionResponse> executeTool(
            @PathVariable String toolName,
            @RequestBody(required = false) java.util.Map<String, String> params) {
        java.util.Map<String, String> safeParams = params != null ? params : java.util.Map.of();
        com.messo.agent.dto.ToolExecutionResponse response = agentService.executeTool(toolName, safeParams);
        return ResponseEntity.ok(response);
    }
}
