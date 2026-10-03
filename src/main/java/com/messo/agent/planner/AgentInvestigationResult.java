package com.messo.agent.planner;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Structured final result of an Agent Run investigation.
 *
 * <p>Preserves strict architectural boundaries:
 * <ul>
 *   <li><b>OBSERVATION</b>: Empirical facts observed from operational data</li>
 *   <li><b>EVIDENCE</b>: Correlated operational signals (ratings, complaints, polls)</li>
 *   <li><b>POSSIBLE FACTOR</b>: Potential contributing factors identified for investigation</li>
 *   <li><b>MODEL OUTPUT</b>: Outputs from existing AI engines (WHY, WHAT NEXT, WHAT IF)</li>
 *   <li><b>REASONING SUMMARY</b>: Narrative summary without speculative causal leaps</li>
 * </ul>
 */
public record AgentInvestigationResult(
        Long runId,
        String goalType,
        String goalDescription,
        List<String> observations,
        List<String> evidence,
        List<String> possibleFactors,
        List<String> modelOutputs,
        String reasoningSummary,
        int totalStepsExecuted,
        String completedAt
) {
    public AgentInvestigationResult {
        observations = observations != null ? List.copyOf(observations) : Collections.emptyList();
        evidence = evidence != null ? List.copyOf(evidence) : Collections.emptyList();
        possibleFactors = possibleFactors != null ? List.copyOf(possibleFactors) : Collections.emptyList();
        modelOutputs = modelOutputs != null ? List.copyOf(modelOutputs) : Collections.emptyList();
    }
}
