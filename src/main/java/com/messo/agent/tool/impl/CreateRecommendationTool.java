package com.messo.agent.tool.impl;

import com.messo.agent.AgentToolRegistry;
import com.messo.agent.AgentToolType;
import com.messo.agent.tool.AgentTool;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;
import org.springframework.stereotype.Component;

/**
 * Tool stub: {@code create_recommendation}
 *
 * <p>Declared as an {@link AgentTool} so it is registered in the tool map,
 * but <strong>execution is intentionally disabled in Phase 2</strong>.</p>
 *
 * <p>Any call to {@link #execute(ToolInput)} returns a controlled failure
 * explaining that this ACTION tool requires human approval, which will be
 * implemented in a later phase.</p>
 *
 * <p>The {@link AgentToolExecutor} provides an additional safety net:
 * it rejects ACTION tools before they even reach this method.</p>
 */
@Component
public class CreateRecommendationTool implements AgentTool {

    @Override
    public String getName() {
        return AgentToolRegistry.CREATE_RECOMMENDATION;
    }

    @Override
    public AgentToolType getType() {
        return AgentToolType.ACTION;
    }

    @Override
    public String getDescription() {
        return "Create an operational recommendation for admin review. "
             + "Requires human approval — not available for autonomous execution in Phase 2.";
    }

    @Override
    public ToolResult execute(ToolInput input) {
        // Phase 2: ACTION tools are non-executing stubs.
        // The AgentToolExecutor guards against this being called,
        // but we provide a safe failure here as a second line of defence.
        return ToolResult.failure(
                getName(), getType(),
                "ACTION_NOT_PERMITTED",
                "Tool '" + getName() + "' is an ACTION tool and cannot be executed "
                + "without explicit human approval. "
                + "Action execution is reserved for a future phase.");
    }
}
