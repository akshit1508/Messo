package com.messo.agent.dto;

import com.messo.agent.task.AgentImplementationTask;
import com.messo.agent.task.AgentImplementationTaskStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AgentImplementationTaskResponse(
        Long id,
        Long agentRunId,
        Long recommendationId,
        String title,
        String description,
        String reason,
        String target,
        AgentImplementationTaskStatus status,
        String createdBy,
        LocalDateTime createdAt,
        String completedBy,
        LocalDateTime completedAt,
        String actionType,
        LocalDate targetDate,
        String mealType,
        String beforeValue,
        String afterValue,
        LocalDateTime executedAt,
        String executedBy
) {
    public AgentImplementationTaskResponse(
            Long id,
            Long agentRunId,
            Long recommendationId,
            String title,
            String description,
            String reason,
            String target,
            AgentImplementationTaskStatus status,
            String createdBy,
            LocalDateTime createdAt,
            String completedBy,
            LocalDateTime completedAt
    ) {
        this(id, agentRunId, recommendationId, title, description, reason, target, status, createdBy, createdAt, completedBy, completedAt, null, null, null, null, null, null, null);
    }

    public static AgentImplementationTaskResponse fromEntity(AgentImplementationTask task) {
        if (task == null) return null;
        return new AgentImplementationTaskResponse(
                task.getId(),
                task.getAgentRunId(),
                task.getRecommendationId(),
                task.getTitle(),
                task.getDescription(),
                task.getReason(),
                task.getTarget(),
                task.getStatus(),
                task.getCreatedBy(),
                task.getCreatedAt(),
                task.getCompletedBy(),
                task.getCompletedAt(),
                task.getActionType(),
                task.getTargetDate(),
                task.getMealType(),
                task.getBeforeValue(),
                task.getAfterValue(),
                task.getExecutedAt(),
                task.getExecutedBy()
        );
    }
}
