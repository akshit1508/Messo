package com.messo.agent.tool;

import com.messo.agent.AgentToolRegistry;
import com.messo.agent.AgentToolType;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Central tool dispatch service for the MESO AI Operations Agent.
 *
 * <h3>Safety guarantees (Phase 2)</h3>
 * <ol>
 *   <li><strong>Explicit registry only</strong> — only tools registered via
 *       Spring's {@link AgentTool} component scan are callable.
 *       Reflection-based arbitrary invocation is not possible.</li>
 *   <li><strong>ACTION tools blocked</strong> — any attempt to execute an
 *       {@link AgentToolType#ACTION} tool returns a controlled failure.
 *       Action execution is reserved for Phase 3 (after human approval).</li>
 *   <li><strong>Unknown tools fail safely</strong> — an unrecognised tool name
 *       returns a controlled failure, not an exception.</li>
 *   <li><strong>Input validated before dispatch</strong> — the tool is
 *       responsible for additional parameter validation.</li>
 *   <li><strong>No secrets exposed</strong> — error messages are sanitised
 *       inside each tool; the executor adds no additional internal detail.</li>
 * </ol>
 *
 * <h3>Phase 2 scope</h3>
 * <p>This executor drives tool execution for controlled testing via the
 * test endpoint and for future orchestration in Phase 3.
 * It does NOT implement autonomous multi-step planning or Gemini reasoning.</p>
 */
@Service
public class AgentToolExecutor {

    private static final Logger log = LoggerFactory.getLogger(AgentToolExecutor.class);

    /** Immutable map of tool name → AgentTool implementation. */
    private final Map<String, AgentTool> toolMap;

    /**
     * Spring injects all {@link AgentTool} components discovered via component scan.
     * The tool map is built once at startup; no tools can be added at runtime.
     */
    public AgentToolExecutor(List<AgentTool> tools) {
        Map<String, AgentTool> map = new LinkedHashMap<>();
        for (AgentTool tool : tools) {
            if (map.containsKey(tool.getName())) {
                throw new IllegalStateException(
                        "Duplicate AgentTool name detected: '" + tool.getName()
                        + "'. Each tool must have a unique name.");
            }
            map.put(tool.getName(), tool);
        }
        this.toolMap = Collections.unmodifiableMap(map);
        log.info("[AgentToolExecutor] Registered {} tool(s): {}", map.size(), map.keySet());
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Executes the named tool with the given input.
     *
     * <p>Returns a {@link ToolResult} in all cases — never throws.
     * Failures (unknown tool, blocked ACTION, tool error) are surfaced
     * as structured failure results.</p>
     *
     * @param toolName the registered name of the tool to execute
     * @param input    validated input parameters (must not be null)
     * @return a structured {@link ToolResult}
     */
    public ToolResult execute(String toolName, ToolInput input) {
        if (toolName == null || toolName.isBlank()) {
            return ToolResult.failure(
                    "(unknown)", AgentToolType.READ_ONLY,
                    "INVALID_TOOL_NAME",
                    "Tool name must not be blank.");
        }

        AgentTool tool = toolMap.get(toolName);

        // Safety check 1: reject unknown tools
        if (tool == null) {
            log.warn("[AgentToolExecutor] Attempted to execute unknown tool: '{}'", toolName);
            return ToolResult.failure(
                    toolName, AgentToolType.READ_ONLY,
                    "UNKNOWN_TOOL",
                    "Tool '" + toolName + "' is not registered. "
                    + "Only registered tools in AgentToolRegistry may be executed.");
        }

        // Safety check 2: reject ACTION tools in Phase 2
        if (tool.getType() == AgentToolType.ACTION) {
            log.warn("[AgentToolExecutor] Attempted to execute ACTION tool '{}' without approval",
                    toolName);
            return ToolResult.failure(
                    toolName, AgentToolType.ACTION,
                    "ACTION_EXECUTION_BLOCKED",
                    "Tool '" + toolName + "' is an ACTION tool. "
                    + "ACTION tools require explicit human approval before execution. "
                    + "Approval workflow will be implemented in Phase 3.");
        }

        // Validate input not null
        ToolInput safeInput = (input != null) ? input : ToolInput.empty();

        log.debug("[AgentToolExecutor] Executing tool '{}' at {}", toolName, LocalDateTime.now());
        long startNs = System.nanoTime();

        try {
            ToolResult result = tool.execute(safeInput);
            long durationMs = (System.nanoTime() - startNs) / 1_000_000;
            log.info("[AgentToolExecutor] Tool '{}' completed in {}ms, success={}",
                    toolName, durationMs, result.isSuccess());
            return result;
        } catch (Exception ex) {
            // The tool should have caught this internally — this is a last-resort guard
            log.error("[AgentToolExecutor] Tool '{}' threw an unexpected exception", toolName, ex);
            return ToolResult.failure(
                    toolName, tool.getType(),
                    "TOOL_EXECUTION_ERROR",
                    "An unexpected error occurred while executing tool '" + toolName + "'.");
        }
    }

    // =========================================================================
    // Introspection helpers
    // =========================================================================

    /**
     * Returns all registered tool implementations.
     */
    public Collection<AgentTool> getRegisteredTools() {
        return toolMap.values();
    }

    /**
     * Returns {@code true} if a tool with the given name is registered.
     */
    public boolean isRegistered(String toolName) {
        return toolMap.containsKey(toolName);
    }

    /**
     * Returns the registered tool for the given name, or {@code null} if not found.
     */
    public AgentTool getTool(String toolName) {
        return toolMap.get(toolName);
    }
}
