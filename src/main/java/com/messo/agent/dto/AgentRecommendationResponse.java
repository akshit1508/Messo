package com.messo.agent.dto;

import com.messo.agent.recommendation.AgentRecommendation;
import java.time.LocalDateTime;

public record AgentRecommendationResponse(
        Long id,
        Long agentRunId,
        String recommendationType,
        String title,
        String description,
        String suggestedTarget,
        String rationale,
        String status,
        String createdBy,
        LocalDateTime createdAt
) {
    public static AgentRecommendationResponse from(AgentRecommendation rec) {
        return new AgentRecommendationResponse(
                rec.getId(),
                rec.getAgentRunId(),
                rec.getRecommendationType(),
                rec.getTitle(),
                rec.getDescription(),
                rec.getSuggestedTarget(),
                rec.getRationale(),
                rec.getStatus(),
                rec.getCreatedBy(),
                rec.getCreatedAt()
        );
    }
}
