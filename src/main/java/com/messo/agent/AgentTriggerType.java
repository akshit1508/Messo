package com.messo.agent;

/**
 * Describes what initiated an Agent Run.
 *
 * Phase 1 only supports MANUAL.
 * Future phases may add SYSTEM_EVENT, SCHEDULED, and ANOMALY.
 */
public enum AgentTriggerType {

    /** Run was explicitly started by an authenticated administrator. */
    MANUAL,

    /**
     * Run was triggered automatically by an internal system event
     * (e.g., rating threshold breach).
     * Reserved for future phases.
     */
    SYSTEM_EVENT,

    /**
     * Run was triggered by a scheduled timer.
     * Reserved for future phases.
     */
    SCHEDULED,

    /**
     * Run was triggered by an anomaly detection signal.
     * Reserved for future phases.
     */
    ANOMALY
}
