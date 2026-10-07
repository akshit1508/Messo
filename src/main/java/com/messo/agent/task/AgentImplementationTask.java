package com.messo.agent.task;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Operational domain entity representing a human implementation task
 * created following approval of an Agent recommendation (Phase 7.2).
 *
 * <p>Core guarantees:</p>
 * <ul>
 *   <li>Bound strictly to an approved {@code AgentRecommendation}.</li>
 *   <li>Unique constraint on {@code recommendation_id} enforces one task per recommendation.</li>
 *   <li>Human-controlled execution: never modifies operational menu or foods automatically.</li>
 * </ul>
 */
@Entity
@Table(
    name = "agent_implementation_tasks",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_agent_impl_task_rec_id", columnNames = {"recommendation_id"}),
        @UniqueConstraint(name = "uk_agent_impl_task_run_id", columnNames = {"agent_run_id"})
    }
)
public class AgentImplementationTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_run_id", nullable = false)
    private Long agentRunId;

    @Column(name = "recommendation_id", nullable = false)
    private Long recommendationId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "target", length = 255)
    private String target;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private AgentImplementationTaskStatus status = AgentImplementationTaskStatus.OPEN;

    @Column(name = "created_by", nullable = false, length = 255)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "completed_by", length = 255)
    private String completedBy;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "action_type", length = 64)
    private String actionType;

    @Column(name = "target_date")
    private java.time.LocalDate targetDate;

    @Column(name = "meal_type", length = 32)
    private String mealType;

    @Column(name = "before_value", length = 255)
    private String beforeValue;

    @Column(name = "after_value", length = 255)
    private String afterValue;

    @Column(name = "executed_at")
    private LocalDateTime executedAt;

    @Column(name = "executed_by", length = 255)
    private String executedBy;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getAgentRunId() { return agentRunId; }
    public void setAgentRunId(Long agentRunId) { this.agentRunId = agentRunId; }

    public Long getRecommendationId() { return recommendationId; }
    public void setRecommendationId(Long recommendationId) { this.recommendationId = recommendationId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getTarget() { return target; }
    public void setTarget(String target) { this.target = target; }

    public AgentImplementationTaskStatus getStatus() { return status; }
    public void setStatus(AgentImplementationTaskStatus status) { this.status = status; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getCompletedBy() { return completedBy; }
    public void setCompletedBy(String completedBy) { this.completedBy = completedBy; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public java.time.LocalDate getTargetDate() { return targetDate; }
    public void setTargetDate(java.time.LocalDate targetDate) { this.targetDate = targetDate; }

    public String getMealType() { return mealType; }
    public void setMealType(String mealType) { this.mealType = mealType; }

    public String getBeforeValue() { return beforeValue; }
    public void setBeforeValue(String beforeValue) { this.beforeValue = beforeValue; }

    public String getAfterValue() { return afterValue; }
    public void setAfterValue(String afterValue) { this.afterValue = afterValue; }

    public LocalDateTime getExecutedAt() { return executedAt; }
    public void setExecutedAt(LocalDateTime executedAt) { this.executedAt = executedAt; }

    public String getExecutedBy() { return executedBy; }
    public void setExecutedBy(String executedBy) { this.executedBy = executedBy; }
}
