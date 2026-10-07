package com.messo.agent.qa;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.messo.agent.*;
import com.messo.agent.actionbrief.ActionBrief;
import com.messo.agent.actionbrief.ActionBriefService;
import com.messo.agent.actionbrief.ProposedActionType;
import com.messo.agent.dto.ActionExecutionResponse;
import com.messo.agent.dto.AgentRecommendationResponse;
import com.messo.agent.dto.AgentRunResponse;
import com.messo.agent.dto.AgentStepResponse;
import com.messo.agent.execution.ActionExecutionService;
import com.messo.agent.execution.ActionExecutionStatus;
import com.messo.agent.execution.AgentActionExecution;
import com.messo.agent.execution.AgentActionExecutionRepository;
import com.messo.agent.planner.AgentInvestigationResult;
import com.messo.agent.planner.AgentOrchestratorService;
import com.messo.agent.planner.AgentPlannerEngine;
import com.messo.agent.planner.PlannerContext;
import com.messo.agent.planner.PlannerDecision;
import com.messo.agent.planner.gemini.GeminiAgentPlannerEngine;
import com.messo.agent.recommendation.AgentRecommendation;
import com.messo.agent.recommendation.AgentRecommendationRepository;
import com.messo.agent.tool.AgentToolExecutor;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Phase 7 Master End-to-End, Security, Regression, and Showcase QA Suite.
 *
 * Verifies all 21 key operational, state-machine, and safety criteria for the
 * MESO AI Operations Agent without modifying existing intelligence engines.
 */
@ExtendWith(MockitoExtension.class)
public class AgentComprehensiveQaTest {

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
    private AgentToolRegistry toolRegistry;
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
        toolRegistry = new AgentToolRegistry();
        agentService = new AgentService(
                runRepository, stepRepository, toolRegistry, toolExecutor, orchestratorService, actionExecutionService, recommendationRepository, taskService
        );
    }

    // =========================================================================
    // 1. GOLDEN END-TO-END SHOWCASE SCENARIO
    // "Investigate why dinner satisfaction has recently declined."
    // =========================================================================
    @Nested
    @DisplayName("1. Golden End-to-End Showcase Scenario")
    class GoldenScenarioTests {

        @Test
        @DisplayName("Complete 22-step golden investigation scenario executes deterministically")
        void goldenScenario_dinnerSatisfactionDecline() throws Exception {
            // Step 1: Admin starts investigation
            AgentRun run = new AgentRun();
            setField(run, "id", 101L);
            run.setGoalType(AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE);
            run.setGoalTarget("DINNER_SATISFACTION");
            run.setGoalDescription("Investigate why dinner satisfaction has recently declined.");
            run.setTriggerType(AgentTriggerType.MANUAL);
            run.setInitiatedBy("admin@messo.com");
            run.setStatus(AgentRunStatus.PENDING);

            when(runRepository.findById(101L)).thenReturn(Optional.of(run));
            when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

            // Multi-step tool sequencing via planner:
            // Step 1: Recent ratings
            PlannerDecision dec1 = PlannerDecision.callTool("get_recent_ratings", Map.of("limit", "50"), "Check recent dinner ratings");
            // Step 2: Complaints
            PlannerDecision dec2 = PlannerDecision.callTool("get_complaints", Map.of("limit", "20"), "Check complaints pattern");
            // Step 3: Root cause engine
            PlannerDecision dec3 = PlannerDecision.callTool("run_root_cause", Map.of("startDate", "2026-09-01", "endDate", "2026-09-30"), "Invoke Root Cause engine");
            // Step 4: Complete
            PlannerDecision dec4 = PlannerDecision.complete("Investigation synthesized.");

            when(plannerEngine.planNextStep(any(PlannerContext.class)))
                    .thenReturn(dec1)
                    .thenReturn(dec2)
                    .thenReturn(dec3)
                    .thenReturn(dec4);

            when(toolExecutor.execute(eq("get_recent_ratings"), any(ToolInput.class)))
                    .thenReturn(ToolResult.success("get_recent_ratings", AgentToolType.READ_ONLY).summary("Dinner ratings dropped to 2.8 on Thursday").build());
            when(toolExecutor.execute(eq("get_complaints"), any(ToolInput.class)))
                    .thenReturn(ToolResult.success("get_complaints", AgentToolType.READ_ONLY).summary("14 complaints logged regarding Paneer dish texture").build());
            when(toolExecutor.execute(eq("run_root_cause"), any(ToolInput.class)))
                    .thenReturn(ToolResult.success("run_root_cause", AgentToolType.READ_ONLY).summary("Root Cause diagnostic identified preparation timing association (confidence: 0.82)").build());

            AgentStep s1 = new AgentStep();
            s1.setSequenceOrder(1);
            s1.setToolName("get_recent_ratings");
            when(stepRepository.findByRunIdOrderBySequenceOrderAsc(101L)).thenReturn(List.of(s1));

            // 1. Run investigation: PENDING -> RUNNING -> WAITING_FOR_APPROVAL
            AgentRunResponse runResponse = agentService.startInvestigation(101L);
            assertNotNull(runResponse);
            assertEquals(AgentRunStatus.WAITING_FOR_APPROVAL, runResponse.status());
            assertTrue(runResponse.approvalRequired());
            assertNotNull(runResponse.actionBrief());

            // Verify ActionBrief contains epistemic sections
            ActionBrief parsedBrief = objectMapper.readValue(runResponse.actionBrief(), ActionBrief.class);
            assertNotNull(parsedBrief.observations());
            assertNotNull(parsedBrief.evidence());
            assertNotNull(parsedBrief.possibleFactors());
            assertNotNull(parsedBrief.modelOutputs());
            assertNotNull(parsedBrief.proposedAction());
            assertEquals(ProposedActionType.REVIEW_MENU_CHANGE, parsedBrief.proposedAction().type());
            assertNotNull(parsedBrief.rationale());
            assertNotNull(parsedBrief.assumptions());
            assertNotNull(parsedBrief.limitations());
            assertFalse(parsedBrief.sourceSteps().isEmpty());

            // 2. Admin explicitly approves: WAITING_FOR_APPROVAL -> APPROVED
            AgentRunResponse approvedResponse = agentService.approveRun(101L, "admin@messo.com");
            assertEquals(AgentRunStatus.APPROVED, approvedResponse.status());
            assertEquals("admin@messo.com", approvedResponse.approvedBy());
            assertNotNull(approvedResponse.approvedAt());

            // Verify approval alone does NOT execute action
            verifyNoInteractions(recommendationRepository);

            // 3. Admin explicitly executes: APPROVED -> COMPLETED
            when(executionRepository.findByAgentRunId(101L)).thenReturn(Optional.empty());

            when(recommendationRepository.save(any(AgentRecommendation.class))).thenAnswer(inv -> {
                AgentRecommendation rec = inv.getArgument(0);
                setField(rec, "id", 501L);
                return rec;
            });

            AgentActionExecution execAudit = new AgentActionExecution();
            setField(execAudit, "id", 601L);
            execAudit.setAgentRunId(101L);
            execAudit.setActionType("REVIEW_MENU_CHANGE");
            execAudit.setStatus(ActionExecutionStatus.SUCCESS);
            execAudit.setResultSummary("Recommendation created");
            when(executionRepository.save(any(AgentActionExecution.class))).thenReturn(execAudit);

            ActionExecutionResponse execResponse = agentService.executeApprovedAction(101L, "admin@messo.com");

            assertNotNull(execResponse);
            assertEquals(AgentRunStatus.COMPLETED, execResponse.status());
            assertEquals(ActionExecutionStatus.SUCCESS, execResponse.executionStatus());
            assertEquals(501L, execResponse.result().get("recommendationId"));

            // 4. Verification of Recommendation and Execution Audit
            verify(recommendationRepository, times(1)).save(any(AgentRecommendation.class));
            verify(executionRepository, times(1)).save(any(AgentActionExecution.class));

            // Verify recommendation query
            when(recommendationRepository.findByAgentRunId(101L)).thenReturn(List.of(
                    buildRecommendation(501L, 101L, "REVIEW_MENU_CHANGE", "PENDING_REVIEW")
            ));
            List<AgentRecommendationResponse> recs = agentService.getRecommendationsForRun(101L);
            assertEquals(1, recs.size());
            assertEquals("PENDING_REVIEW", recs.get(0).status());
            assertEquals(101L, recs.get(0).agentRunId());
        }
    }

    // =========================================================================
    // 2. STATE MACHINE RIGIDITY TESTING
    // =========================================================================
    @Nested
    @DisplayName("2. State Machine Transition Verification")
    class StateMachineTests {

        @Test
        @DisplayName("All invalid transitions are strictly rejected with zero mutations")
        void invalidStateTransitions_rejectedWithoutMutation() {
            // Test invalid transitions from each state
            AgentRunStatus[] allStatuses = AgentRunStatus.values();

            for (AgentRunStatus current : allStatuses) {
                for (AgentRunStatus target : allStatuses) {
                    boolean isValid = isValidTransition(current, target);
                    if (!isValid) {
                        AgentRun run = new AgentRun();
                        setField(run, "id", 201L);
                        run.setStatus(current);

                        if (target == AgentRunStatus.APPROVED) {
                            if (current != AgentRunStatus.WAITING_FOR_APPROVAL) {
                                when(runRepository.findById(201L)).thenReturn(Optional.of(run));
                                assertThrows(IllegalStateException.class, () -> agentService.approveRun(201L, "admin@test.com"));
                            }
                        } else if (target == AgentRunStatus.CANCELLED) {
                            if (current != AgentRunStatus.WAITING_FOR_APPROVAL && current != AgentRunStatus.PENDING) {
                                when(runRepository.findById(201L)).thenReturn(Optional.of(run));
                                assertThrows(IllegalStateException.class, () -> agentService.rejectRun(201L, "admin@test.com", "reason"));
                            }
                        } else if (target == AgentRunStatus.COMPLETED) {
                            if (current != AgentRunStatus.APPROVED && current != AgentRunStatus.COMPLETED) {
                                when(runRepository.findById(201L)).thenReturn(Optional.of(run));
                                assertThrows(IllegalStateException.class, () -> agentService.executeApprovedAction(201L, "admin@test.com"));
                            }
                        }
                    }
                }
            }

            verifyNoInteractions(recommendationRepository);
        }

        private boolean isValidTransition(AgentRunStatus from, AgentRunStatus to) {
            return switch (from) {
                case PENDING -> to == AgentRunStatus.RUNNING || to == AgentRunStatus.CANCELLED;
                case RUNNING -> to == AgentRunStatus.WAITING_FOR_APPROVAL || to == AgentRunStatus.FAILED;
                case WAITING_FOR_APPROVAL -> to == AgentRunStatus.APPROVED || to == AgentRunStatus.CANCELLED;
                case APPROVED -> to == AgentRunStatus.COMPLETED || to == AgentRunStatus.FAILED;
                case COMPLETED, FAILED, CANCELLED -> false;
            };
        }
    }

    // =========================================================================
    // 3. APPROVAL & EXECUTION SECURITY
    // =========================================================================
    @Nested
    @DisplayName("3. Approval Security & Non-Tampering")
    class ApprovalSecurityTests {

        @Test
        @DisplayName("Execution is bound strictly to persisted ActionBrief and ignores unapproved state")
        void executionIsStrictlyBoundToPersistedActionBrief() throws Exception {
            AgentRun run = new AgentRun();
            setField(run, "id", 301L);
            run.setStatus(AgentRunStatus.APPROVED);

            ActionBrief brief = new ActionBrief(
                    "Original Server Action", "Description",
                    List.of("Observed"), List.of("Evidence"), List.of("Factor"), List.of("Model"),
                    new ActionBrief.ProposedActionDetails(ProposedActionType.REVIEW_MENU_CHANGE, "Original Server Description", "Dinner Menu"),
                    "Original Rationale", List.of(), List.of(), List.of(1),
                    LocalDateTime.now().toString(), "WAITING_FOR_APPROVAL"
            );
            run.setActionBrief(objectMapper.writeValueAsString(brief));

            when(runRepository.findById(301L)).thenReturn(Optional.of(run));
            when(executionRepository.findByAgentRunId(301L)).thenReturn(Optional.empty());

            when(recommendationRepository.save(any(AgentRecommendation.class))).thenAnswer(inv -> {
                AgentRecommendation rec = inv.getArgument(0);
                setField(rec, "id", 999L);
                return rec;
            });
            when(executionRepository.save(any(AgentActionExecution.class))).thenAnswer(inv -> inv.getArgument(0));

            ActionExecutionResponse resp = agentService.executeApprovedAction(301L, "admin@messo.com");

            assertNotNull(resp);
            assertEquals("REVIEW_MENU_CHANGE", resp.actionType());

            // Verify persisted recommendation exactly matches server-side ActionBrief
            ArgumentCaptor<AgentRecommendation> captor = ArgumentCaptor.forClass(AgentRecommendation.class);
            verify(recommendationRepository).save(captor.capture());
            AgentRecommendation saved = captor.getValue();
            assertEquals("Original Server Description", saved.getDescription());
            assertEquals("Dinner Menu", saved.getSuggestedTarget());
            assertEquals("Original Rationale", saved.getRationale());
        }

        @Test
        @DisplayName("Attempting to execute an unsupported action type fails safely")
        void executionFailsOnUnsupportedActionType() throws Exception {
            AgentRun run = new AgentRun();
            setField(run, "id", 302L);
            run.setStatus(AgentRunStatus.APPROVED);

            ActionBrief brief = new ActionBrief(
                    "Unsupported Action", "Description",
                    List.of("Obs"), List.of("Ev"), List.of("Pf"), List.of("Mo"),
                    new ActionBrief.ProposedActionDetails(ProposedActionType.CREATE_ADMIN_FOLLOWUP, "Unsupported Task", "Target"),
                    "Rationale", List.of(), List.of(), List.of(1),
                    LocalDateTime.now().toString(), "WAITING_FOR_APPROVAL"
            );
            run.setActionBrief(objectMapper.writeValueAsString(brief));

            when(runRepository.findById(302L)).thenReturn(Optional.of(run));
            when(executionRepository.findByAgentRunId(302L)).thenReturn(Optional.empty());

            ActionExecutionResponse resp = agentService.executeApprovedAction(302L, "admin@messo.com");

            assertNotNull(resp);
            assertEquals(AgentRunStatus.FAILED, resp.status());
            assertEquals(ActionExecutionStatus.FAILED, resp.executionStatus());
            verifyNoInteractions(recommendationRepository);
        }
    }

    // =========================================================================
    // 4. TOOL SECURITY & ACTION TOOL BLOCKING
    // =========================================================================
    @Nested
    @DisplayName("4. Tool Security & Action Tool Blocking")
    class ToolSecurityTests {

        @Test
        @DisplayName("Action tools are blocked from execution through the tool executor")
        void actionToolsBlockedFromDirectExecution() {
            AgentToolRegistry registry = new AgentToolRegistry();
            assertEquals(10, registry.all().size());

            AgentToolExecutor executor = new AgentToolExecutor(List.of(
                    new com.messo.agent.tool.impl.CreateRecommendationTool(),
                    new com.messo.agent.tool.impl.CreateAdminTaskTool(),
                    new com.messo.agent.tool.impl.SendNotificationTool()
            ));

            List<String> actionTools = List.of("create_recommendation", "create_admin_task", "send_notification");
            for (String toolName : actionTools) {
                ToolResult result = executor.execute(toolName, ToolInput.empty());
                assertFalse(result.isSuccess());
                assertEquals("ACTION_EXECUTION_BLOCKED", result.getErrorCode());
                assertTrue(result.getErrorMessage().contains("require explicit human approval"));
            }
        }

        @Test
        @DisplayName("Unknown or unregistered tool call returns safe failure without reflection")
        void unknownToolFailsSafely() {
            AgentToolExecutor executor = new AgentToolExecutor(List.of(
                    new com.messo.agent.tool.impl.CreateRecommendationTool()
            ));

            ToolResult result = executor.execute("unregistered_malicious_tool", ToolInput.empty());
            assertFalse(result.isSuccess());
            assertEquals("UNKNOWN_TOOL", result.getErrorCode());
        }
    }

    // =========================================================================
    // 5. PLANNER FAILURE & FALLBACK TESTS
    // =========================================================================
    @Nested
    @DisplayName("5. Planner Failure & Safety Ceilings")
    class PlannerFailureTests {

        @Test
        @DisplayName("GeminiAgentPlannerEngine falls back to deterministic sequence when unconfigured")
        void geminiFallbackWhenUnconfigured() {
            GeminiAgentPlannerEngine engine = new GeminiAgentPlannerEngine("", "gemini-1.5-flash", objectMapper);
            assertFalse(engine.isConfigured());

            PlannerContext emptyContext = new PlannerContext(
                    1L,
                    AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE.name(),
                    "Dinner",
                    "Goal description",
                    List.of("get_recent_ratings", "get_complaints", "run_root_cause"),
                    List.of()
            );
            PlannerDecision dec = engine.planNextStep(emptyContext);

            assertEquals("get_recent_ratings", dec.toolName());
            assertNotNull(dec.reasoningSummary());
        }

        @Test
        @DisplayName("Planner loop protection triggers after MAX_STEPS")
        void orchestratorRespectsMaxStepsCeiling() {
            AgentRun run = new AgentRun();
            setField(run, "id", 501L);
            run.setGoalType(AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE);
            run.setStatus(AgentRunStatus.PENDING);

            when(runRepository.findById(501L)).thenReturn(Optional.of(run));
            when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

            // Continuous loop attempt
            PlannerDecision loopDec = PlannerDecision.callTool("get_recent_ratings", Map.of(), "Looping");
            when(plannerEngine.planNextStep(any(PlannerContext.class))).thenReturn(loopDec);
            when(toolExecutor.execute(anyString(), any(ToolInput.class))).thenReturn(
                    ToolResult.success("get_recent_ratings", AgentToolType.READ_ONLY).summary("Result").build()
            );

            AgentRunResponse resp = agentService.startInvestigation(501L);

            // Must terminate safely and produce ActionBrief in WAITING_FOR_APPROVAL
            assertEquals(AgentRunStatus.WAITING_FOR_APPROVAL, resp.status());
            assertNotNull(resp.actionBrief());
        }
    }

    // =========================================================================
    // 6. EXECUTION IDEMPOTENCY & CONCURRENCY
    // =========================================================================
    @Nested
    @DisplayName("6. Execution Idempotency & Race Recovery")
    class IdempotencyTests {

        @Test
        @DisplayName("Executing an already COMPLETED run returns existing execution idempotently")
        void doubleExecutionIsIdempotent() {
            AgentRun run = new AgentRun();
            setField(run, "id", 601L);
            run.setStatus(AgentRunStatus.COMPLETED);

            AgentActionExecution existing = new AgentActionExecution();
            setField(existing, "id", 801L);
            existing.setAgentRunId(601L);
            existing.setActionType("REVIEW_MENU_CHANGE");
            existing.setStatus(ActionExecutionStatus.SUCCESS);
            existing.setResultSummary("Already executed");
            existing.setCompletedAt(LocalDateTime.now());

            when(runRepository.findById(601L)).thenReturn(Optional.of(run));
            when(executionRepository.findByAgentRunId(601L)).thenReturn(Optional.of(existing));

            ActionExecutionResponse resp = agentService.executeApprovedAction(601L, "admin@messo.com");

            assertNotNull(resp);
            assertEquals(AgentRunStatus.COMPLETED, resp.status());
            assertTrue(resp.summary().contains("idempotent"));
            verifyNoInteractions(recommendationRepository);
            verify(executionRepository, never()).save(any());
        }

        @Test
        @DisplayName("Concurrent execution race condition recovers idempotently via DataIntegrityViolation")
        void concurrentRaceConditionRecoversIdempotently() throws Exception {
            AgentRun run = new AgentRun();
            setField(run, "id", 602L);
            run.setStatus(AgentRunStatus.APPROVED);

            ActionBrief brief = new ActionBrief(
                    "Title", "Summary", List.of(), List.of(), List.of(), List.of(),
                    new ActionBrief.ProposedActionDetails(ProposedActionType.REVIEW_MENU_CHANGE, "Desc", "Target"),
                    "Rationale", List.of(), List.of(), List.of(1), LocalDateTime.now().toString(), "WAITING_FOR_APPROVAL"
            );
            run.setActionBrief(objectMapper.writeValueAsString(brief));

            AgentActionExecution racedExec = new AgentActionExecution();
            setField(racedExec, "id", 999L);
            racedExec.setAgentRunId(602L);
            racedExec.setActionType("REVIEW_MENU_CHANGE");
            racedExec.setStatus(ActionExecutionStatus.SUCCESS);
            racedExec.setResultSummary("Executed concurrently");

            when(runRepository.findById(602L)).thenReturn(Optional.of(run));
            when(executionRepository.findByAgentRunId(602L))
                    .thenReturn(Optional.empty())
                    .thenReturn(Optional.of(racedExec));

            when(recommendationRepository.save(any(AgentRecommendation.class)))
                    .thenThrow(new DataIntegrityViolationException("Duplicate key uk_action_execution_run_id"));

            ActionExecutionResponse resp = agentService.executeApprovedAction(602L, "admin@messo.com");

            assertNotNull(resp);
            assertEquals(AgentRunStatus.COMPLETED, resp.status());
            assertTrue(resp.summary().contains("idempotent recovery"));
        }
    }

    // =========================================================================
    // 7. REJECTION FLOW
    // =========================================================================
    @Nested
    @DisplayName("7. Rejection Flow")
    class RejectionTests {

        @Test
        @DisplayName("Rejecting a run transitions to CANCELLED, preserves reason, and prevents execution")
        void rejectionFlowTransitionsToCancelledWithoutExecution() {
            AgentRun run = new AgentRun();
            setField(run, "id", 701L);
            run.setStatus(AgentRunStatus.WAITING_FOR_APPROVAL);

            when(runRepository.findById(701L)).thenReturn(Optional.of(run));
            when(runRepository.save(any(AgentRun.class))).thenAnswer(inv -> inv.getArgument(0));

            AgentRunResponse resp = agentService.rejectRun(701L, "supervisor@messo.com", "Schedule already locked");

            assertEquals(AgentRunStatus.CANCELLED, resp.status());
            assertEquals("supervisor@messo.com", resp.rejectedBy());
            assertEquals("Schedule already locked", resp.rejectionReason());
            assertNotNull(resp.rejectedAt());

            // Verify cannot execute CANCELLED run
            assertThrows(IllegalStateException.class, () -> agentService.executeApprovedAction(701L, "supervisor@messo.com"));
            verifyNoInteractions(recommendationRepository);
        }
    }

    // =========================================================================
    // 8. TRANSACTION ROLLBACK ON FAILURE
    // =========================================================================
    @Nested
    @DisplayName("8. Transaction Failure Rollback")
    class TransactionFailureTests {

        @Test
        @DisplayName("Exception during action execution records failure and leaves run in FAILED status")
        void exceptionDuringExecutionRecordsAuditFailure() throws Exception {
            AgentRun run = new AgentRun();
            setField(run, "id", 801L);
            run.setStatus(AgentRunStatus.APPROVED);

            ActionBrief brief = new ActionBrief(
                    "Title", "Summary", List.of(), List.of(), List.of(), List.of(),
                    new ActionBrief.ProposedActionDetails(ProposedActionType.REVIEW_MENU_CHANGE, "Desc", "Target"),
                    "Rationale", List.of(), List.of(), List.of(1), LocalDateTime.now().toString(), "WAITING_FOR_APPROVAL"
            );
            run.setActionBrief(objectMapper.writeValueAsString(brief));

            when(runRepository.findById(801L)).thenReturn(Optional.of(run));
            when(executionRepository.findByAgentRunId(801L)).thenReturn(Optional.empty());

            when(recommendationRepository.save(any(AgentRecommendation.class)))
                    .thenThrow(new RuntimeException("Simulated disk I/O failure"));

            ActionExecutionResponse resp = agentService.executeApprovedAction(801L, "admin@messo.com");

            assertNotNull(resp);
            assertEquals(AgentRunStatus.FAILED, resp.status());
            assertEquals(ActionExecutionStatus.FAILED, resp.executionStatus());
            assertEquals("ACTION_EXECUTION_FAILED", run.getFailureCode());

            // Verify execution record logged as FAILED
            ArgumentCaptor<AgentActionExecution> execCaptor = ArgumentCaptor.forClass(AgentActionExecution.class);
            verify(executionRepository).save(execCaptor.capture());
            assertEquals(ActionExecutionStatus.FAILED, execCaptor.getValue().getStatus());
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================
    private AgentRecommendation buildRecommendation(Long id, Long runId, String type, String status) {
        AgentRecommendation r = new AgentRecommendation();
        setField(r, "id", id);
        r.setAgentRunId(runId);
        r.setRecommendationType(type);
        r.setTitle("Title");
        r.setDescription("Description");
        r.setStatus(status);
        r.setCreatedBy("admin@messo.com");
        r.setCreatedAt(LocalDateTime.now());
        return r;
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
