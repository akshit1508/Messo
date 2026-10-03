package com.messo.agent;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * JPA entity representing one step within an {@link AgentRun}.
 *
 * <p>Steps are ordered by {@link #sequenceOrder} (1-based, ascending).
 * The Agent executes them sequentially.  Each step corresponds to a single
 * tool invocation.  The tool name is stored as a plain {@code String} that
 * must match a registered name in {@link AgentToolRegistry}.</p>
 *
 * <h3>Database conventions</h3>
 * <ul>
 *   <li>Table: {@code agent_step}</li>
 *   <li>FK: {@code run_id → agent_run(id)}</li>
 *   <li>Index on {@code (run_id, sequence_order)} for ordered retrieval</li>
 *   <li>Input/output stored as JSON text — no raw AI prompts or secrets</li>
 * </ul>
 *
 * <p>Phase 1: steps are created as stubs in PENDING state.
 * Phase 2 will drive them through RUNNING → COMPLETED | FAILED.</p>
 */
@Entity
@Table(
    name = "agent_step",
    indexes = {
        @Index(name = "idx_agent_step_run", columnList = "run_id"),
        @Index(name = "idx_agent_step_run_seq", columnList = "run_id, sequence_order")
    }
)
public class AgentStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // -------------------------------------------------------------------------
    // Parent run
    // -------------------------------------------------------------------------

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "run_id", nullable = false)
    private AgentRun run;

    // -------------------------------------------------------------------------
    // Step identity
    // -------------------------------------------------------------------------

    /** 1-based position of this step within the run (determines execution order). */
    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder;

    /**
     * Registered tool name from {@link AgentToolRegistry}.
     * Example: {@code "run_root_cause"}, {@code "get_recent_ratings"}.
     */
    @Column(name = "tool_name", nullable = false, length = 100)
    private String toolName;

    /**
     * Safety classification snapshot at the time the step was created.
     * Stored here to make the step record self-documenting.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "tool_type", nullable = false, length = 16)
    private AgentToolType toolType;

    // -------------------------------------------------------------------------
    // Status
    // -------------------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AgentStepStatus status;

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
    // Input / Output metadata (summary only — no raw prompts, no secrets)
    // -------------------------------------------------------------------------

    /**
     * JSON summary of the parameters passed to the tool.
     * Must NOT include sensitive information such as API keys or PII.
     */
    @Column(name = "input_summary", columnDefinition = "TEXT")
    private String inputSummary;

    /**
     * JSON summary of the tool's output.
     * Must NOT include raw AI reasoning chains or internal model details.
     */
    @Column(name = "output_summary", columnDefinition = "TEXT")
    private String outputSummary;

    // -------------------------------------------------------------------------
    // Error information
    // -------------------------------------------------------------------------

    @Column(name = "error_code", length = 100)
    private String errorCode;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    // =========================================================================
    // Lifecycle callback
    // =========================================================================

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = AgentStepStatus.PENDING;
        }
    }

    // =========================================================================
    // Convenience helpers
    // =========================================================================

    /**
     * Returns the elapsed duration in milliseconds between startedAt and
     * completedAt, or {@code null} if either timestamp is absent.
     */
    public Long getDurationMs() {
        if (startedAt == null || completedAt == null) {
            return null;
        }
        return java.time.Duration.between(startedAt, completedAt).toMillis();
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public Long getId() { return id; }

    public AgentRun getRun() { return run; }
    public void setRun(AgentRun run) { this.run = run; }

    public int getSequenceOrder() { return sequenceOrder; }
    public void setSequenceOrder(int sequenceOrder) { this.sequenceOrder = sequenceOrder; }

    public String getToolName() { return toolName; }
    public void setToolName(String toolName) { this.toolName = toolName; }

    public AgentToolType getToolType() { return toolType; }
    public void setToolType(AgentToolType toolType) { this.toolType = toolType; }

    public AgentStepStatus getStatus() { return status; }
    public void setStatus(AgentStepStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public String getInputSummary() { return inputSummary; }
    public void setInputSummary(String inputSummary) { this.inputSummary = inputSummary; }

    public String getOutputSummary() { return outputSummary; }
    public void setOutputSummary(String outputSummary) { this.outputSummary = outputSummary; }

    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}
