package com.messo.agent.planner;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Minimized context passed to Gemini or fallback planning engine.
 *
 * <p>Strict data minimization invariants:
 * <ul>
 *   <li>Contains no database credentials or internal filesystem paths</li>
 *   <li>Contains no student names, emails, or personal identification</li>
 *   <li>Only contains aggregated observations and structured summaries</li>
 * </ul>
 */
public record PlannerContext(
        Long runId,
        String goalType,
        String goalTarget,
        String goalDescription,
        List<String> allowedToolNames,
        List<StepRecord> executedSteps
) {
    public record StepRecord(
            int sequenceOrder,
            String toolName,
            Map<String, String> inputParams,
            boolean success,
            String summary,
            String sanitizedDataSummary
    ) {}

    public PlannerContext {
        allowedToolNames = allowedToolNames != null ? List.copyOf(allowedToolNames) : Collections.emptyList();
        executedSteps = executedSteps != null ? List.copyOf(executedSteps) : Collections.emptyList();
    }
}
