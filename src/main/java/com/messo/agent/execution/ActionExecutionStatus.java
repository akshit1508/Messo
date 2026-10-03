package com.messo.agent.execution;

/**
 * Lifecycle status of an action execution for an approved AgentRun.
 */
public enum ActionExecutionStatus {
    /** Action is currently executing within its transactional boundary. */
    EXECUTING,

    /** Action completed successfully. */
    SUCCESS,

    /** Action execution failed. */
    FAILED
}
