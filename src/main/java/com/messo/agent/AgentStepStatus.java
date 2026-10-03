package com.messo.agent;

/**
 * Controlled status values for an individual Agent Step.
 *
 * Steps within a run execute in sequence. Each step transitions
 * through: PENDING → RUNNING → COMPLETED | FAILED | SKIPPED.
 */
public enum AgentStepStatus {

    /** Step is queued but has not started yet. */
    PENDING,

    /** Step is currently executing. */
    RUNNING,

    /** Step finished successfully. */
    COMPLETED,

    /** Step encountered an unrecoverable error. */
    FAILED,

    /**
     * Step was intentionally bypassed (e.g., precondition not met,
     * or superseded by a prior result).
     */
    SKIPPED
}
