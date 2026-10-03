package com.messo.agent.tool.impl;

import com.messo.agent.AgentToolRegistry;
import com.messo.agent.AgentToolType;
import com.messo.agent.tool.AgentTool;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;
import org.springframework.stereotype.Component;

/**
 * Tool stub: {@code send_notification}
 *
 * <p>Declared as an {@link AgentTool} so it is registered in the tool map,
 * but <strong>execution is intentionally disabled in Phase 2</strong>.</p>
 *
 * <p>Any call to {@link #execute(ToolInput)} returns a controlled failure.
 * The {@link AgentToolExecutor} also rejects ACTION tools at dispatch time.</p>
 */
@Component
public class SendNotificationTool implements AgentTool {

    @Override
    public String getName() {
        return AgentToolRegistry.SEND_NOTIFICATION;
    }

    @Override
    public AgentToolType getType() {
        return AgentToolType.ACTION;
    }

    @Override
    public String getDescription() {
        return "Send a targeted notification to students or admins. "
             + "Requires human approval — not available for autonomous execution in Phase 2.";
    }

    @Override
    public ToolResult execute(ToolInput input) {
        return ToolResult.failure(
                getName(), getType(),
                "ACTION_NOT_PERMITTED",
                "Tool '" + getName() + "' is an ACTION tool and cannot be executed "
                + "without explicit human approval. "
                + "Action execution is reserved for a future phase.");
    }
}
