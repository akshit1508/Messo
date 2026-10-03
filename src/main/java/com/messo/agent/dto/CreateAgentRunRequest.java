package com.messo.agent.dto;

import com.messo.agent.AgentGoalType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/admin/agent/runs}.
 *
 * <p>Creates a new MANUAL Agent Run in PENDING state.
 * Phase 1 only supports MANUAL trigger; the triggerType field is therefore
 * not exposed in this request — it is always defaulted to MANUAL by the service.</p>
 *
 * <h3>Example</h3>
 * <pre>{@code
 * {
 *   "goalType": "INVESTIGATE_OPERATIONAL_ISSUE",
 *   "goalTarget": "DINNER_SATISFACTION",
 *   "goalDescription": "Investigate why recent dinner satisfaction declined"
 * }
 * }</pre>
 */
public record CreateAgentRunRequest(

        @NotNull(message = "goalType is required")
        AgentGoalType goalType,

        @Size(max = 100, message = "goalTarget must not exceed 100 characters")
        String goalTarget,

        @Size(max = 2000, message = "goalDescription must not exceed 2000 characters")
        String goalDescription

) {}
