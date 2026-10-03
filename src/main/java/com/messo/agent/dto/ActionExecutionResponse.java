package com.messo.agent.dto;

import com.messo.agent.AgentRunStatus;
import com.messo.agent.execution.ActionExecutionStatus;

import java.util.Map;

/**
 * Structured response for the action execution endpoint.
 */
public record ActionExecutionResponse(
        Long runId,
        AgentRunStatus status,
        String actionType,
        ActionExecutionStatus executionStatus,
        String summary,
        String error,
        Map<String, Object> result
) {
    public static ActionExecutionResponse success(
            Long runId,
            AgentRunStatus status,
            String actionType,
            String summary,
            Map<String, Object> result) {
        return new ActionExecutionResponse(
                runId,
                status,
                actionType,
                ActionExecutionStatus.SUCCESS,
                summary,
                null,
                result != null ? result : Map.of()
        );
    }

    public static ActionExecutionResponse failure(
            Long runId,
            AgentRunStatus status,
            String actionType,
            String error) {
        return new ActionExecutionResponse(
                runId,
                status,
                actionType,
                ActionExecutionStatus.FAILED,
                null,
                error,
                Map.of()
        );
    }
}
