package com.messo.agent.planner;

import java.util.Collections;
import java.util.Map;

/**
 * Structured decision emitted by the planning engine for each investigation step.
 *
 * <p>Invariant:
 * <ul>
 *   <li>If {@code decisionType == CALL_TOOL}, {@code toolName} must be non-null and match an allowed tool.</li>
 *   <li>{@code reasoningSummary} describes <em>what</em> next step is investigated, avoiding causal leaps.</li>
 * </ul>
 */
public record PlannerDecision(
        PlannerDecisionType decisionType,
        String toolName,
        Map<String, String> toolInput,
        String reasoningSummary,
        boolean investigationComplete,
        String failureReason
) {

    public static PlannerDecision callTool(String toolName, Map<String, String> toolInput, String reasoningSummary) {
        return new PlannerDecision(
                PlannerDecisionType.CALL_TOOL,
                toolName,
                toolInput != null ? Collections.unmodifiableMap(toolInput) : Collections.emptyMap(),
                reasoningSummary,
                false,
                null
        );
    }

    public static PlannerDecision complete(String reasoningSummary) {
        return new PlannerDecision(
                PlannerDecisionType.COMPLETE,
                null,
                Collections.emptyMap(),
                reasoningSummary,
                true,
                null
        );
    }

    public static PlannerDecision fail(String failureReason) {
        return new PlannerDecision(
                PlannerDecisionType.FAIL,
                null,
                Collections.emptyMap(),
                null,
                false,
                failureReason
        );
    }
}
