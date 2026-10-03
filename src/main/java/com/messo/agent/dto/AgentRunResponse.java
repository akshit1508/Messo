package com.messo.agent.dto;

import com.messo.agent.*;

import java.time.LocalDateTime;

/**
 * Response DTO for a single {@link AgentRun}.
 *
 * <p>Returned by:</p>
 * <ul>
 *   <li>{@code POST /api/admin/agent/runs} (created run)</li>
 *   <li>{@code GET /api/admin/agent/runs/:id} (run detail)</li>
 *   <li>{@code GET /api/admin/agent/runs} (run list items)</li>
 * </ul>
 */
public record AgentRunResponse(

        Long id,
        AgentGoalType goalType,
        String goalTarget,
        String goalDescription,
        AgentTriggerType triggerType,
        AgentRunStatus status,
        String currentStepName,
        Boolean approvalRequired,
        String initiatedBy,
        LocalDateTime createdAt,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        String failureCode,
        String failureReason,
        String finalResult

) {

    /**
     * Factory method: converts an {@link AgentRun} entity into a response DTO.
     */
    public static AgentRunResponse from(AgentRun run) {
        return new AgentRunResponse(
                run.getId(),
                run.getGoalType(),
                run.getGoalTarget(),
                run.getGoalDescription(),
                run.getTriggerType(),
                run.getStatus(),
                run.getCurrentStepName(),
                run.getApprovalRequired(),
                run.getInitiatedBy(),
                run.getCreatedAt(),
                run.getStartedAt(),
                run.getCompletedAt(),
                run.getFailureCode(),
                run.getFailureReason(),
                run.getFinalResult()
        );
    }
}
