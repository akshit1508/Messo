package com.messo.agent;

/**
 * Immutable descriptor for a tool available to the MESO AI Operations Agent.
 *
 * <p>A {@code AgentToolDefinition} declares <em>what</em> a tool does, its
 * safety classification, and its textual description.  It does NOT contain
 * any implementation.  The Agent planner uses the registry of definitions
 * to select and validate tools before invoking their adapters in Phase 2.</p>
 *
 * <h3>Tool taxonomy</h3>
 * <pre>
 *  READ TOOLS          – observe operational data
 *  EXISTING AI TOOLS   – delegate to existing WHY / WHAT NEXT / WHAT IF engines
 *  FUTURE ACTION TOOLS – produce operational side-effects (Phase 2+)
 * </pre>
 *
 * <p>Phase 1: All tools are definitions only.  No execution logic lives here.</p>
 */
public class AgentToolDefinition {

    private final String name;
    private final AgentToolType toolType;
    private final String description;

    public AgentToolDefinition(String name, AgentToolType toolType, String description) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Tool name must not be blank");
        }
        if (toolType == null) {
            throw new IllegalArgumentException("Tool type must not be null");
        }
        this.name = name;
        this.toolType = toolType;
        this.description = description;
    }

    /** Stable, machine-readable identifier for this tool (e.g., {@code "run_root_cause"}). */
    public String getName() {
        return name;
    }

    /** Whether this tool is safe to run autonomously or requires approval. */
    public AgentToolType getToolType() {
        return toolType;
    }

    /** Human-readable description of what this tool does. */
    public String getDescription() {
        return description;
    }

    /**
     * Convenience check: returns {@code true} if this tool may be invoked
     * without human approval.
     */
    public boolean isReadOnly() {
        return toolType == AgentToolType.READ_ONLY;
    }

    @Override
    public String toString() {
        return "AgentToolDefinition{name='" + name + "', type=" + toolType + "}";
    }
}
