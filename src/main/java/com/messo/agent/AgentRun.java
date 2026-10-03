package com.messo.agent;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * JPA entity representing one execution of the MESO AI Operations Agent.
 *
 * <p>An Agent Run is the top-level unit of work.  It has a {@link AgentGoal}
 * describing what the Agent should investigate or accomplish, and a
 * {@link AgentRunStatus} tracking its lifecycle.</p>
 *
 * <h3>Lifecycle (Phase 1)</h3>
 * <pre>
 *   POST /api/admin/agent/runs → PENDING
 *   (Phase 2 will drive transitions through RUNNING, WAITING_FOR_APPROVAL, etc.)
 * </pre>
 *
 * <h3>Database conventions</h3>
 * <ul>
 *   <li>Table name: {@code agent_run}</li>
 *   <li>Primary key: auto-incremented {@code BIGINT}</li>
 *   <li>Enums stored as {@code VARCHAR} for readability and schema stability</li>
 *   <li>{@code ddl-auto=update} will auto-create this table on first start</li>
 * </ul>
 *
 * <p>This entity is append-oriented.  Existing rows are never deleted by the Agent;
 * only {@code status}, timestamp, and error fields are updated.</p>
 */
@Entity
@Table(name = "agent_run")
public class AgentRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // -------------------------------------------------------------------------
    // Goal (embedded; no separate table for simplicity in Phase 1)
    // -------------------------------------------------------------------------

    /** The category of this run's objective (e.g., INVESTIGATE_OPERATIONAL_ISSUE). */
    @Enumerated(EnumType.STRING)
    @Column(name = "goal_type", nullable = false, length = 64)
    private AgentGoalType goalType;

    /**
     * Optional sub-target within the goal type.
     * Example: for INVESTIGATE_RATING_DROP this might be "DINNER_SATISFACTION".
     */
    @Column(name = "goal_target", length = 100)
    private String goalTarget;

    /**
     * Free-text description of the goal set by the initiating administrator.
     * Stored as TEXT to accommodate longer descriptions without truncation.
     */
    @Column(name = "goal_description", columnDefinition = "TEXT")
    private String goalDescription;

    // -------------------------------------------------------------------------
    // Run metadata
    // -------------------------------------------------------------------------

    /** How this run was initiated (MANUAL in Phase 1). */
    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false, length = 32)
    private AgentTriggerType triggerType;

    /** Current lifecycle status of this run. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AgentRunStatus status;

    /** The step the Agent is currently executing (null if PENDING or COMPLETED). */
    @Column(name = "current_step_name", length = 100)
    private String currentStepName;

    // -------------------------------------------------------------------------
    // Approval (reserved for Phase 2)
    // -------------------------------------------------------------------------

    /**
     * Whether the run is blocked waiting for operator approval.
     */
    @Column(name = "approval_required")
    private Boolean approvalRequired = false;

    /**
     * Structured Action Brief JSON generated from the completed investigation.
     */
    @Column(name = "action_brief", columnDefinition = "TEXT")
    private String actionBrief;

    /** Admin email who approved the proposed action. */
    @Column(name = "approved_by", length = 255)
    private String approvedBy;

    /** Timestamp when the action brief was approved. */
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    /** Admin email who rejected the proposed action. */
    @Column(name = "rejected_by", length = 255)
    private String rejectedBy;

    /** Timestamp when the action brief was rejected. */
    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    /** Human-readable explanation if rejected. */
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    // -------------------------------------------------------------------------
    // Timestamps
    // -------------------------------------------------------------------------

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // -------------------------------------------------------------------------
    // Failure information
    // -------------------------------------------------------------------------

    /** Short error code if the run transitioned to FAILED (e.g., "TOOL_EXECUTION_ERROR"). */
    @Column(name = "failure_code", length = 100)
    private String failureCode;

    /** Human-readable reason for failure. */
    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    /**
     * Structured final result JSON produced upon completion of the investigation.
     * Contains OBSERVATION, EVIDENCE, POSSIBLE FACTOR, MODEL OUTPUT, and REASONING SUMMARY.
     */
    @Column(name = "final_result", columnDefinition = "TEXT")
    private String finalResult;

    // -------------------------------------------------------------------------
    // Audit: who initiated this run
    // -------------------------------------------------------------------------

    /** Email of the admin who created this run (populated from Spring Security principal). */
    @Column(name = "initiated_by", nullable = false, length = 255)
    private String initiatedBy;

    // =========================================================================
    // Lifecycle callback
    // =========================================================================

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = AgentRunStatus.PENDING;
        }
        if (triggerType == null) {
            triggerType = AgentTriggerType.MANUAL;
        }
    }

    // =========================================================================
    // Getters & Setters (explicit, following project convention)
    // =========================================================================

    public Long getId() { return id; }

    public AgentGoalType getGoalType() { return goalType; }
    public void setGoalType(AgentGoalType goalType) { this.goalType = goalType; }

    public String getGoalTarget() { return goalTarget; }
    public void setGoalTarget(String goalTarget) { this.goalTarget = goalTarget; }

    public String getGoalDescription() { return goalDescription; }
    public void setGoalDescription(String goalDescription) { this.goalDescription = goalDescription; }

    public AgentTriggerType getTriggerType() { return triggerType; }
    public void setTriggerType(AgentTriggerType triggerType) { this.triggerType = triggerType; }

    public AgentRunStatus getStatus() { return status; }
    public void setStatus(AgentRunStatus status) { this.status = status; }

    public String getCurrentStepName() { return currentStepName; }
    public void setCurrentStepName(String currentStepName) { this.currentStepName = currentStepName; }

    public Boolean getApprovalRequired() { return approvalRequired; }
    public void setApprovalRequired(Boolean approvalRequired) { this.approvalRequired = approvalRequired; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public String getFailureCode() { return failureCode; }
    public void setFailureCode(String failureCode) { this.failureCode = failureCode; }

    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }

    public String getFinalResult() { return finalResult; }
    public void setFinalResult(String finalResult) { this.finalResult = finalResult; }

    public String getActionBrief() { return actionBrief; }
    public void setActionBrief(String actionBrief) { this.actionBrief = actionBrief; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }

    public String getRejectedBy() { return rejectedBy; }
    public void setRejectedBy(String rejectedBy) { this.rejectedBy = rejectedBy; }

    public LocalDateTime getRejectedAt() { return rejectedAt; }
    public void setRejectedAt(LocalDateTime rejectedAt) { this.rejectedAt = rejectedAt; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getInitiatedBy() { return initiatedBy; }
    public void setInitiatedBy(String initiatedBy) { this.initiatedBy = initiatedBy; }
}
