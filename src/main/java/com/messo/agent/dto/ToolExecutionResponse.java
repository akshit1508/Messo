package com.messo.agent.dto;

import com.messo.agent.AgentToolType;
import com.messo.agent.tool.result.ToolResult;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Response DTO representing the outcome of an Agent tool execution.
 */
public record ToolExecutionResponse(
        boolean success,
        String toolName,
        AgentToolType toolType,
        String summary,
        Map<String, Object> data,
        Map<String, Object> metadata,
        String errorCode,
        String errorMessage,
        LocalDateTime executedAt,
        long durationMs
) {
    public static ToolExecutionResponse from(ToolResult result) {
        return new ToolExecutionResponse(
                result.isSuccess(),
                result.getToolName(),
                result.getToolType(),
                result.getSummary(),
                result.getData(),
                result.getMetadata(),
                result.getErrorCode(),
                result.getErrorMessage(),
                result.getExecutedAt(),
                result.getDurationMs()
        );
    }
}
