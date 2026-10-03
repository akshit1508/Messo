package com.messo.agent.execution;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * JPA entity representing the execution record of an approved action.
 *
 * <p>Enforces auditability and double-execution protection (unique constraint
 * on {@code agent_run_id}).</p>
 */
@Entity
@Table(
    name = "agent_action_executions",
    uniqueConstraints = @UniqueConstraint(name = "uk_action_execution_run_id", columnNames = {"agent_run_id"})
)
public class AgentActionExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_run_id", nullable = false)
    private Long agentRunId;

    @Column(name = "action_type", nullable = false, length = 64)
    private String actionType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ActionExecutionStatus status;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "executed_by", nullable = false, length = 255)
    private String executedBy;

    @Column(name = "result_summary", columnDefinition = "TEXT")
    private String resultSummary;

    @Column(name = "error_code", length = 100)
    private String errorCode;

    @Column(name = "error_summary", columnDefinition = "TEXT")
    private String errorSummary;

    @Column(name = "target_reference", length = 255)
    private String targetReference;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getAgentRunId() { return agentRunId; }
    public void setAgentRunId(Long agentRunId) { this.agentRunId = agentRunId; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public ActionExecutionStatus getStatus() { return status; }
    public void setStatus(ActionExecutionStatus status) { this.status = status; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public String getExecutedBy() { return executedBy; }
    public void setExecutedBy(String executedBy) { this.executedBy = executedBy; }

    public String getResultSummary() { return resultSummary; }
    public void setResultSummary(String resultSummary) { this.resultSummary = resultSummary; }

    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }

    public String getErrorSummary() { return errorSummary; }
    public void setErrorSummary(String errorSummary) { this.errorSummary = errorSummary; }

    public String getTargetReference() { return targetReference; }
    public void setTargetReference(String targetReference) { this.targetReference = targetReference; }
}
