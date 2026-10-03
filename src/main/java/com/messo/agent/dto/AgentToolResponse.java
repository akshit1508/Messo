package com.messo.agent.dto;

import com.messo.agent.AgentToolDefinition;
import com.messo.agent.AgentToolType;

/**
 * Response DTO for a registered {@link AgentToolDefinition}.
 *
 * <p>Returned by {@code GET /api/admin/agent/tools}.</p>
 */
public record AgentToolResponse(

        String name,
        AgentToolType toolType,
        boolean readOnly,
        String description

) {

    public static AgentToolResponse from(AgentToolDefinition def) {
        return new AgentToolResponse(
                def.getName(),
                def.getToolType(),
                def.isReadOnly(),
                def.getDescription()
        );
    }
}
