package com.messo.agent;

/**
 * Represents the high-level objective category of an Agent Run.
 *
 * The goal type governs which tools and reasoning path the Agent
 * will select when it executes (Phase 2+).
 *
 * Phase 1 establishes the vocabulary; only INVESTIGATE_OPERATIONAL_ISSUE
 * is expected to be used initially. Additional goal types are
 * pre-declared for future extensibility.
 */
public enum AgentGoalType {

    /**
     * Investigate a general operational issue in the mess.
     * Default goal type for Phase 1 manual runs.
     */
    INVESTIGATE_OPERATIONAL_ISSUE,

    /**
     * Investigate a decline in a specific rating dimension
     * (e.g., dinner satisfaction, food quality, cleanliness).
     */
    INVESTIGATE_RATING_DROP,

    /**
     * Investigate a spike in complaints, optionally filtered
     * by complaint type or period.
     */
    INVESTIGATE_COMPLAINT_SPIKE,

    /**
     * Review historical and predicted performance of a menu item
     * or the full menu across a time window.
     */
    REVIEW_MENU_PERFORMANCE
}
