package com.messo.agent.planner;

/**
 * Controlled decision types emitted by the Agent Planner.
 */
public enum PlannerDecisionType {

    /**
     * The planner decided to execute a registered tool to collect more evidence.
     */
    CALL_TOOL,

    /**
     * The planner determined sufficient evidence has been collected,
     * and the investigation is complete.
     */
    COMPLETE,

    /**
     * The planner encountered an unrecoverable situation or failure.
     */
    FAIL
}
