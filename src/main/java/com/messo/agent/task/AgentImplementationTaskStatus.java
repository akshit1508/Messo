package com.messo.agent.task;

/**
 * Lifecycle status for human implementation tasks.
 *
 * <p>State transitions:</p>
 * <ul>
 *   <li>OPEN &rarr; IN_PROGRESS &rarr; COMPLETED</li>
 *   <li>OPEN &rarr; CANCELLED</li>
 *   <li>IN_PROGRESS &rarr; CANCELLED</li>
 * </ul>
 * <p>Terminal states {@code COMPLETED} and {@code CANCELLED} cannot be restarted.</p>
 */
public enum AgentImplementationTaskStatus {
    OPEN,
    IN_PROGRESS,
    READY_FOR_VERIFICATION,
    COMPLETED,
    CANCELLED
}
