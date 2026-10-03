package com.messo.agent;

/**
 * Controlled state machine for an Agent Run lifecycle.
 *
 * <pre>
 *  PENDING
 *    │
 *    ▼
 *  RUNNING ─────────────────────┐
 *    │                          │
 *    ▼                          ▼
 *  WAITING_FOR_APPROVAL       FAILED
 *    │
 *    ├─ (approved) ──► RUNNING (next step)
 *    │
 *    └─ (rejected) ──► CANCELLED
 *
 *  RUNNING ──► COMPLETED
 * </pre>
 *
 * Phase 1: Only PENDING / COMPLETED / FAILED / CANCELLED are exercised.
 * WAITING_FOR_APPROVAL is reserved for Phase 2 (action approval gate).
 */
public enum AgentRunStatus {

    /** Run has been created and is queued, but has not started yet. */
    PENDING,

    /** Run is actively executing steps. */
    RUNNING,

    /**
     * Run has paused and is waiting for a human operator to approve a
     * proposed action before execution continues.
     * Reserved for Phase 2.
     */
    WAITING_FOR_APPROVAL,

    /** Run finished successfully; all steps completed without error. */
    COMPLETED,

    /** Run could not complete due to an unrecoverable error. */
    FAILED,

    /** Run was explicitly cancelled (e.g., operator rejected a proposed action). */
    CANCELLED
}
