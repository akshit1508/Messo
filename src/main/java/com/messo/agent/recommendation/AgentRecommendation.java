package com.messo.agent.recommendation;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Operational domain entity representing an approved Agent recommendation.
 *
 * <p>A recommendation is an administrative proposal created following
 * explicit human approval of an Agent investigation.
 * Creating a recommendation does NOT mutate menu, foods, reviews, or complaints.</p>
 */
@Entity
@Table(name = "agent_recommendations")
public class AgentRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_run_id", nullable = false)
    private Long agentRunId;

    @Column(name = "recommendation_type", nullable = false, length = 64)
    private String recommendationType;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "suggested_target", length = 255)
    private String suggestedTarget;

    @Column(name = "rationale", columnDefinition = "TEXT")
    private String rationale;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "PENDING_REVIEW";

    @Column(name = "created_by", nullable = false, length = 255)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getAgentRunId() { return agentRunId; }
    public void setAgentRunId(Long agentRunId) { this.agentRunId = agentRunId; }

    public String getRecommendationType() { return recommendationType; }
    public void setRecommendationType(String recommendationType) { this.recommendationType = recommendationType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSuggestedTarget() { return suggestedTarget; }
    public void setSuggestedTarget(String suggestedTarget) { this.suggestedTarget = suggestedTarget; }

    public String getRationale() { return rationale; }
    public void setRationale(String rationale) { this.rationale = rationale; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
