package com.messo.agent.planner;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.messo.agent.*;
import com.messo.agent.tool.AgentToolExecutor;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Orchestrator service for driving multi-step Agent investigations.
 *
 * <p>Enforces all Phase 3A constraints:
 * <ul>
 *   <li>Only allowed READ_ONLY and AI tools can be selected</li>
 *   <li>ACTION tools are strictly rejected</li>
 *   <li>Hard limits on MAX_STEPS (configurable, default 6) to prevent infinite loops</li>
 *   <li>Duplicate tool/parameter detection to prevent cyclic repetitions</li>
 *   <li>Step lifecycle: PENDING -> RUNNING -> COMPLETED or FAILED</li>
 *   <li>Every step is recorded in {@link AgentStep}</li>
 *   <li>Final structured result synthesized into {@link AgentInvestigationResult} and saved to {@link AgentRun#setFinalResult(String)}</li>
 * </ul>
 */
@Service
public class AgentOrchestratorService {

    private static final Logger log = LoggerFactory.getLogger(AgentOrchestratorService.class);

    public static final Set<String> ALLOWED_TOOLS = Set.of(
            AgentToolRegistry.GET_RECENT_RATINGS,
            AgentToolRegistry.GET_COMPLAINTS,
            AgentToolRegistry.GET_POLL_RESULTS,
            AgentToolRegistry.GET_MENU_HISTORY,
            AgentToolRegistry.RUN_ROOT_CAUSE,
            AgentToolRegistry.RUN_FORECAST,
            AgentToolRegistry.RUN_SIMULATION
    );

    private final AgentRunRepository runRepository;
    private final AgentStepRepository stepRepository;
    private final AgentToolExecutor toolExecutor;
    private final AgentPlannerEngine plannerEngine;
    private final ObjectMapper objectMapper;
    private final com.messo.agent.actionbrief.ActionBriefService actionBriefService;

    @Value("${app.agent.max-steps:6}")
    private int maxSteps = 6;

    public AgentOrchestratorService(
            AgentRunRepository runRepository,
            AgentStepRepository stepRepository,
            AgentToolExecutor toolExecutor,
            AgentPlannerEngine plannerEngine,
            ObjectMapper objectMapper,
            com.messo.agent.actionbrief.ActionBriefService actionBriefService) {
        this.runRepository = runRepository;
        this.stepRepository = stepRepository;
        this.toolExecutor = toolExecutor;
        this.plannerEngine = plannerEngine;
        this.objectMapper = objectMapper;
        this.actionBriefService = actionBriefService;
    }

    public int getMaxSteps() {
        return maxSteps;
    }

    public void setMaxSteps(int maxSteps) {
        this.maxSteps = maxSteps;
    }

    /**
     * Executes the investigation loop synchronously for a given AgentRun.
     * Transitions run to RUNNING, executes steps in sequence, and completes or fails.
     *
     * @param runId the ID of the run to execute
     * @return the updated AgentRun
     */
    @Transactional
    public AgentRun runInvestigation(Long runId) {
        AgentRun run = runRepository.findById(runId)
                .orElseThrow(() -> new NoSuchElementException("Agent run not found with id: " + runId));

        if (run.getStatus() != AgentRunStatus.PENDING) {
            log.warn("Cannot start run {} because it is in status {}", runId, run.getStatus());
            return run;
        }

        run.setStatus(AgentRunStatus.RUNNING);
        run.setStartedAt(LocalDateTime.now());
        runRepository.save(run);

        log.info("Started AgentRun {} investigation: goalType={}, target={}",
                run.getId(), run.getGoalType(), run.getGoalTarget());

        List<PlannerContext.StepRecord> executedSteps = new ArrayList<>();
        Set<String> executedToolCalls = new HashSet<>();

        List<String> observations = new ArrayList<>();
        List<String> evidence = new ArrayList<>();
        List<String> possibleFactors = new ArrayList<>();
        List<String> modelOutputs = new ArrayList<>();
        StringBuilder overallReasoning = new StringBuilder();

        int stepSequence = 1;

        while (stepSequence <= maxSteps) {
            PlannerContext context = new PlannerContext(
                    run.getId(),
                    run.getGoalType().name(),
                    run.getGoalTarget(),
                    run.getGoalDescription(),
                    new ArrayList<>(ALLOWED_TOOLS),
                    executedSteps
            );

            PlannerDecision decision;
            try {
                decision = plannerEngine.planNextStep(context);
            } catch (Exception ex) {
                log.error("Planner engine threw an exception for run {}", run.getId(), ex);
                return failRun(run, "PLANNER_FAILURE", "Planner engine failed: " + ex.getMessage());
            }

            if (decision == null) {
                return failRun(run, "PLANNER_ERROR", "Planner emitted null decision.");
            }

            if (decision.decisionType() == PlannerDecisionType.FAIL) {
                return failRun(run, "PLANNER_REJECTED", decision.failureReason() != null ? decision.failureReason() : "Planner requested failure.");
            }

            if (decision.decisionType() == PlannerDecisionType.COMPLETE || decision.investigationComplete()) {
                log.info("Planner marked investigation complete for run {} after {} steps.", run.getId(), stepSequence - 1);
                if (decision.reasoningSummary() != null) {
                    overallReasoning.append(decision.reasoningSummary());
                }
                return completeRun(run, observations, evidence, possibleFactors, modelOutputs, overallReasoning.toString(), stepSequence - 1);
            }

            // Must be CALL_TOOL
            String toolName = decision.toolName();
            Map<String, String> toolParams = decision.toolInput() != null ? decision.toolInput() : Map.of();

            // Safety rule 1: Validate tool allowed
            if (toolName == null || !ALLOWED_TOOLS.contains(toolName)) {
                log.warn("Planner requested unauthorized or unknown tool: {}", toolName);
                return failRun(run, "UNAUTHORIZED_TOOL", "Planner requested tool '" + toolName + "' which is not allowed or unknown.");
            }

            // Safety rule 2: Check for duplicate loop
            String toolFingerprint = toolName + ":" + new TreeMap<>(toolParams);
            if (executedToolCalls.contains(toolFingerprint)) {
                log.warn("Planner attempted duplicate tool execution: {}. Terminating loop safely.", toolFingerprint);
                overallReasoning.append(" Repeated analysis bypassed. Evidence collection sufficient.");
                return completeRun(run, observations, evidence, possibleFactors, modelOutputs, overallReasoning.toString(), stepSequence - 1);
            }
            executedToolCalls.add(toolFingerprint);

            // Execute the step
            run.setCurrentStepName(toolName);
            runRepository.save(run);

            AgentStep step = new AgentStep();
            step.setRun(run);
            step.setSequenceOrder(stepSequence);
            step.setToolName(toolName);
            step.setToolType(AgentToolType.READ_ONLY); // All allowed tools in Phase 3A are READ_ONLY
            step.setStatus(AgentStepStatus.RUNNING);
            step.setStartedAt(LocalDateTime.now());
            try {
                step.setInputSummary(objectMapper.writeValueAsString(toolParams));
            } catch (Exception ignored) {
                step.setInputSummary(toolParams.toString());
            }
            stepRepository.save(step);

            ToolResult result = toolExecutor.execute(toolName, ToolInput.of(toolParams));
            step.setCompletedAt(LocalDateTime.now());

            if (result.isSuccess()) {
                step.setStatus(AgentStepStatus.COMPLETED);
                step.setOutputSummary(result.getSummary());

                // Categorize structured signals
                if (toolName.contains("rating") || toolName.contains("menu")) {
                    observations.add(result.getSummary());
                } else if (toolName.contains("complaint") || toolName.contains("poll")) {
                    evidence.add(result.getSummary());
                    possibleFactors.add("Operational signals observed from " + toolName);
                } else if (toolName.startsWith("run_")) {
                    modelOutputs.add(result.getSummary());
                }

                executedSteps.add(new PlannerContext.StepRecord(
                        stepSequence,
                        toolName,
                        toolParams,
                        true,
                        result.getSummary(),
                        result.getData() != null ? result.getData().toString() : ""
                ));
            } else {
                step.setStatus(AgentStepStatus.FAILED);
                step.setErrorCode(result.getErrorCode());
                step.setErrorMessage(result.getErrorMessage());
                step.setOutputSummary("Failed: " + result.getErrorMessage());

                executedSteps.add(new PlannerContext.StepRecord(
                        stepSequence,
                        toolName,
                        toolParams,
                        false,
                        result.getErrorMessage(),
                        ""
                ));
            }
            stepRepository.save(step);

            stepSequence++;
        }

        // If loop completes without planner marking complete -> step limit exceeded
        log.warn("Agent run {} exceeded max steps limit of {}", run.getId(), maxSteps);
        return failRun(run, "STEP_LIMIT_EXCEEDED", "Agent investigation step limit reached (" + maxSteps + " steps).");
    }

    private AgentRun completeRun(
            AgentRun run,
            List<String> observations,
            List<String> evidence,
            List<String> possibleFactors,
            List<String> modelOutputs,
            String reasoning,
            int totalSteps) {

        run.setStatus(AgentRunStatus.WAITING_FOR_APPROVAL);
        run.setApprovalRequired(true);
        run.setCompletedAt(LocalDateTime.now());
        run.setCurrentStepName(null);

        AgentInvestigationResult finalResult = new AgentInvestigationResult(
                run.getId(),
                run.getGoalType().name(),
                run.getGoalDescription(),
                observations,
                evidence,
                possibleFactors,
                modelOutputs,
                reasoning.isBlank() ? "Investigation concluded with observed data and engine evidence." : reasoning,
                totalSteps,
                LocalDateTime.now().toString()
        );

        try {
            run.setFinalResult(objectMapper.writeValueAsString(finalResult));
        } catch (Exception ex) {
            log.error("Failed to serialize final investigation result", ex);
            run.setFinalResult("{\"status\":\"WAITING_FOR_APPROVAL\"}");
        }

        // Generate structured Action Brief proposal
        try {
            List<AgentStep> executedSteps = stepRepository.findByRunIdOrderBySequenceOrderAsc(run.getId());
            com.messo.agent.actionbrief.ActionBrief brief = actionBriefService.generateActionBrief(run, finalResult, executedSteps);
            run.setActionBrief(objectMapper.writeValueAsString(brief));
            log.info("Generated ActionBrief for run {}: proposedAction={}", run.getId(), brief.proposedAction().type());
        } catch (Exception ex) {
            log.error("Failed to generate Action Brief for run {}", run.getId(), ex);
            return failRun(run, "ACTION_BRIEF_GENERATION_FAILED", "Failed to generate Action Brief: " + ex.getMessage());
        }

        return runRepository.save(run);
    }

    private AgentRun failRun(AgentRun run, String failureCode, String failureReason) {
        run.setStatus(AgentRunStatus.FAILED);
        run.setCompletedAt(LocalDateTime.now());
        run.setFailureCode(failureCode);
        run.setFailureReason(failureReason);
        run.setCurrentStepName(null);
        return runRepository.save(run);
    }
}
