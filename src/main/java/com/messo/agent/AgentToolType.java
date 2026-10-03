package com.messo.agent;

/**
 * Safety classification for every tool available to the Agent.
 *
 * <ul>
 *   <li>{@link #READ_ONLY} – Tools that only observe data. Safe to
 *       execute autonomously without human review.</li>
 *   <li>{@link #ACTION} – Tools that produce a real-world side-effect
 *       (e.g., creating a recommendation, sending a notification).
 *       These MUST NOT be executed without explicit human approval.</li>
 * </ul>
 *
 * The Agent planner (Phase 2) must enforce this distinction:
 * any step whose tool classification is ACTION must transition
 * the run into WAITING_FOR_APPROVAL before execution.
 */
public enum AgentToolType {

    /**
     * Tool is purely observational. It reads data or runs an analysis
     * but does not mutate operational state.
     * Examples: get_recent_ratings, run_root_cause, run_forecast.
     */
    READ_ONLY,

    /**
     * Tool produces a side-effect in the operational system.
     * Human approval is mandatory before the Agent may invoke it.
     * Examples: create_recommendation, create_admin_task, send_notification.
     */
    ACTION
}
