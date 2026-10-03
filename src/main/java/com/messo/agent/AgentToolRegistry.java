package com.messo.agent;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Registry of all tools available to the MESO AI Operations Agent.
 *
 * <p>This registry is the <em>single source of truth</em> for which tools
 * the Agent may select.  Each tool is declared as an {@link AgentToolDefinition}
 * that captures its name, safety classification, and description.</p>
 *
 * <h3>Tool groups (Phase 1 declarations)</h3>
 * <pre>
 *  READ TOOLS (READ_ONLY)
 *    get_recent_ratings   – Fetch the most recent student meal ratings
 *    get_complaints       – Fetch recent complaint records
 *    get_poll_results     – Fetch recent food poll results
 *    get_menu_history     – Fetch historical daily menu data
 *
 *  EXISTING AI TOOLS (READ_ONLY) – delegated to existing engines, NOT re-implemented
 *    run_root_cause       – WHY engine: root-cause investigation
 *    run_forecast         – WHAT NEXT engine: rating / demand forecast
 *    run_simulation       – WHAT IF engine: scenario simulation
 *
 *  FUTURE ACTION TOOLS (ACTION) – declared only; execution is Phase 2+
 *    create_recommendation – Persist an operational recommendation
 *    create_admin_task     – Create an admin action task
 *    send_notification     – Send a targeted notification
 * </pre>
 *
 * <p><strong>IMPORTANT:</strong> Adding a new tool here does NOT implement it.
 * Phase 2 will add adapter/executor implementations that are looked up by tool name.</p>
 */
@Component
public class AgentToolRegistry {

    // -------------------------------------------------------------------------
    // READ TOOLS — observe operational data, no side-effects
    // -------------------------------------------------------------------------
    public static final String GET_RECENT_RATINGS  = "get_recent_ratings";
    public static final String GET_COMPLAINTS      = "get_complaints";
    public static final String GET_POLL_RESULTS    = "get_poll_results";
    public static final String GET_MENU_HISTORY    = "get_menu_history";

    // -------------------------------------------------------------------------
    // EXISTING AI TOOLS — delegates to WHY / WHAT NEXT / WHAT IF (not re-implemented)
    // -------------------------------------------------------------------------
    public static final String RUN_ROOT_CAUSE  = "run_root_cause";
    public static final String RUN_FORECAST    = "run_forecast";
    public static final String RUN_SIMULATION  = "run_simulation";

    // -------------------------------------------------------------------------
    // FUTURE ACTION TOOLS — declared; execution requires human approval (Phase 2+)
    // -------------------------------------------------------------------------
    public static final String CREATE_RECOMMENDATION = "create_recommendation";
    public static final String CREATE_ADMIN_TASK     = "create_admin_task";
    public static final String SEND_NOTIFICATION     = "send_notification";

    // -------------------------------------------------------------------------
    // Registry map — insertion order preserved for deterministic iteration
    // -------------------------------------------------------------------------
    private final Map<String, AgentToolDefinition> registry;

    public AgentToolRegistry() {
        Map<String, AgentToolDefinition> map = new LinkedHashMap<>();

        // READ TOOLS
        register(map, GET_RECENT_RATINGS, AgentToolType.READ_ONLY,
                "Fetch the most recent student meal ratings from the operational database.");
        register(map, GET_COMPLAINTS, AgentToolType.READ_ONLY,
                "Fetch recent complaint records, optionally filtered by type or date range.");
        register(map, GET_POLL_RESULTS, AgentToolType.READ_ONLY,
                "Fetch the results of recent food preference polls.");
        register(map, GET_MENU_HISTORY, AgentToolType.READ_ONLY,
                "Fetch historical daily menu records for trend analysis.");

        // EXISTING AI TOOLS (wrappers around existing engines — NOT re-implemented here)
        register(map, RUN_ROOT_CAUSE, AgentToolType.READ_ONLY,
                "Invoke the WHY engine to perform a root-cause investigation for a given date range.");
        register(map, RUN_FORECAST, AgentToolType.READ_ONLY,
                "Invoke the WHAT NEXT engine to produce a rating or demand forecast for a food item.");
        register(map, RUN_SIMULATION, AgentToolType.READ_ONLY,
                "Invoke the WHAT IF engine to simulate an operational scenario (e.g., menu change).");

        // FUTURE ACTION TOOLS
        register(map, CREATE_RECOMMENDATION, AgentToolType.ACTION,
                "Persist an operational recommendation for admin review. Requires human approval.");
        register(map, CREATE_ADMIN_TASK, AgentToolType.ACTION,
                "Create an admin action task in the operational system. Requires human approval.");
        register(map, SEND_NOTIFICATION, AgentToolType.ACTION,
                "Send a targeted notification to students or admins. Requires human approval.");

        this.registry = Collections.unmodifiableMap(map);
    }

    private void register(Map<String, AgentToolDefinition> map,
                          String name, AgentToolType type, String description) {
        map.put(name, new AgentToolDefinition(name, type, description));
    }

    /**
     * Returns the {@link AgentToolDefinition} for the given tool name,
     * or throws {@link java.util.NoSuchElementException} if not found.
     */
    public AgentToolDefinition get(String name) {
        AgentToolDefinition def = registry.get(name);
        if (def == null) {
            throw new java.util.NoSuchElementException("Unknown tool: " + name);
        }
        return def;
    }

    /**
     * Returns {@code true} if a tool with the given name is registered.
     */
    public boolean contains(String name) {
        return registry.containsKey(name);
    }

    /**
     * Returns an unmodifiable view of all registered tool definitions.
     */
    public Collection<AgentToolDefinition> all() {
        return registry.values();
    }
}
