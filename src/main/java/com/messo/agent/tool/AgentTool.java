package com.messo.agent.tool;

import com.messo.agent.AgentToolType;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;

/**
 * Contract for every tool available to the MESO AI Operations Agent.
 *
 * <p>All tool implementations must be registered in the
 * {@link AgentToolExecutor} to be eligible for invocation.
 * Unknown or unregistered tool names are rejected at dispatch time.</p>
 *
 * <h3>Safety guarantee</h3>
 * <ul>
 *   <li>READ_ONLY tools: may be invoked autonomously by the Agent.</li>
 *   <li>ACTION tools: must reject execution in Phase 2.
 *       They become active only after the human-approval gate is
 *       implemented in a later phase.</li>
 * </ul>
 *
 * <h3>Input contract</h3>
 * <p>Every tool validates its {@link ToolInput} before executing.
 * Invalid input produces a {@link ToolResult} with
 * {@code success=false} and a descriptive error — never an exception
 * that escapes to the HTTP layer.</p>
 */
public interface AgentTool {

    /**
     * Returns the registered name of this tool.
     * Must match a constant in {@link com.messo.agent.AgentToolRegistry}.
     */
    String getName();

    /**
     * Returns the safety classification of this tool.
     */
    AgentToolType getType();

    /**
     * Returns a human-readable description of what this tool does.
     */
    String getDescription();

    /**
     * Executes the tool with the given structured input.
     *
     * <p>Implementations must:
     * <ul>
     *   <li>Validate the input and return a failure result for invalid data.</li>
     *   <li>Never mutate operational data (for READ_ONLY tools).</li>
     *   <li>Reject execution and return a failure result (for ACTION tools in Phase 2).</li>
     *   <li>Catch and isolate all internal exceptions.</li>
     *   <li>Never expose stack traces, credentials, or secrets in the result.</li>
     * </ul>
     *
     * @param input  the structured input for this tool (may not be null)
     * @return a {@link ToolResult} that always has a defined success/failure state
     */
    ToolResult execute(ToolInput input);
}
