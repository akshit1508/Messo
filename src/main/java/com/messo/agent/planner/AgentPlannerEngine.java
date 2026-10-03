package com.messo.agent.planner;

/**
 * Interface representing the planning engine (e.g. powered by Gemini with deterministic fallback).
 */
public interface AgentPlannerEngine {

    /**
     * Given the sanitized context, determines the next structured decision.
     *
     * @param context the current sanitized context of the investigation
     * @return the planner decision
     */
    PlannerDecision planNextStep(PlannerContext context);
}
