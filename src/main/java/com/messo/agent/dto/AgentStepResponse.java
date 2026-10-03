package com.messo.agent.dto;

import com.messo.agent.AgentStep;
import com.messo.agent.AgentStepStatus;
import com.messo.agent.AgentToolType;

import java.time.LocalDateTime;

/**
 * Response DTO for a single {@link AgentStep}.
 *
 * <p>Returned by {@code GET /api/admin/agent/runs/:id/steps}.</p>
 *
 * <p>Note: {@code inputSummary} and {@code outputSummary} are included but
 * must never contain sensitive information (no API keys, no raw AI prompts).
 * The service layer is responsible for enforcing this invariant.</p>
 */
public record AgentStepResponse(

        Long id,
        Long runId,
        int sequenceOrder,
        String toolName,
        AgentToolType toolType,
        AgentStepStatus status,
        LocalDateTime createdAt,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        Long durationMs,
        String inputSummary,
        String outputSummary,
        String errorCode,
        String errorMessage

) {

    /**
     * Factory method: converts an {@link AgentStep} entity into a response DTO.
     */
    public static AgentStepResponse from(AgentStep step) {
        return new AgentStepResponse(
                step.getId(),
                step.getRun().getId(),
                step.getSequenceOrder(),
                step.getToolName(),
                step.getToolType(),
                step.getStatus(),
                step.getCreatedAt(),
                step.getStartedAt(),
                step.getCompletedAt(),
                step.getDurationMs(),
                step.getInputSummary(),
                step.getOutputSummary(),
                step.getErrorCode(),
                step.getErrorMessage()
        );
    }
}
