package com.messo.agent.tool.impl;

import com.messo.agent.AgentToolRegistry;
import com.messo.agent.AgentToolType;
import com.messo.agent.tool.AgentTool;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;
import com.messo.service.AiGatewayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Tool adapter: {@code run_simulation}
 *
 * <p>Invokes the <strong>existing</strong> WHAT IF (Simulation) engine via
 * {@link AiGatewayService#runSimulation(Map)}.
 * This adapter is a thin delegation layer — it contains NO Monte Carlo or
 * simulation logic. All computation remains in the Python FastAPI simulation engine.</p>
 *
 * <h3>Accepted input parameters</h3>
 * <ul>
 *   <li>{@code scenarioName} — required: human-readable name for the scenario</li>
 *   <li>{@code scenarioType} — required: type of simulation (e.g., "FOOD_REPLACEMENT")</li>
 *   <li>Additional domain-specific parameters are passed through transparently.</li>
 * </ul>
 *
 * <h3>What it calls</h3>
 * {@code AiGatewayService.runSimulation()} → existing {@code /api/v1/simulations}
 * FastAPI endpoint → existing Python simulation engine.
 *
 * <p>The existing behavior, Monte Carlo calculations, and contracts are not modified.</p>
 */
@Component
public class RunSimulationTool implements AgentTool {

    private static final Logger log = LoggerFactory.getLogger(RunSimulationTool.class);

    /** Allowed scenario types — prevents arbitrary strings from reaching the engine. */
    private static final java.util.Set<String> ALLOWED_SCENARIO_TYPES = java.util.Set.of(
            "FOOD_REPLACEMENT",
            "MENU_REORDER",
            "PORTION_CHANGE",
            "MEAL_TIME_CHANGE"
    );

    private final AiGatewayService aiGatewayService;

    public RunSimulationTool(AiGatewayService aiGatewayService) {
        this.aiGatewayService = aiGatewayService;
    }

    @Override
    public String getName() {
        return AgentToolRegistry.RUN_SIMULATION;
    }

    @Override
    public AgentToolType getType() {
        return AgentToolType.READ_ONLY;
    }

    @Override
    public String getDescription() {
        return "Invoke the existing WHAT IF (Simulation) engine to model operational scenarios. "
             + "Required: scenarioName, scenarioType "
             + "(FOOD_REPLACEMENT | MENU_REORDER | PORTION_CHANGE | MEAL_TIME_CHANGE).";
    }

    @Override
    public ToolResult execute(ToolInput input) {
        long startNs = System.nanoTime();

        // Validate required parameters
        if (!input.has("scenarioName")) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT", "Parameter 'scenarioName' is required.");
        }
        if (!input.has("scenarioType")) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT", "Parameter 'scenarioType' is required.");
        }

        String scenarioName = input.get("scenarioName").trim();
        String scenarioType = input.get("scenarioType").trim().toUpperCase();

        if (scenarioName.isBlank()) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT", "Parameter 'scenarioName' must not be blank.");
        }
        if (!ALLOWED_SCENARIO_TYPES.contains(scenarioType)) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT",
                    "Parameter 'scenarioType' must be one of: "
                            + ALLOWED_SCENARIO_TYPES + ". Got: " + scenarioType);
        }

        // Build payload — only pass safe, validated parameters
        Map<String, Object> payload = new HashMap<>();
        payload.put("scenario_name", scenarioName);
        payload.put("scenario_type", scenarioType);

        // Pass through optional parameters that are present in input
        // This allows the existing simulation engine to receive its full context
        for (Map.Entry<String, String> e : input.asMap().entrySet()) {
            if (!e.getKey().equals("scenarioName") && !e.getKey().equals("scenarioType")) {
                payload.put(e.getKey(), e.getValue());
            }
        }

        try {
            // Delegate to the EXISTING AiGatewayService — no logic duplication
            ResponseEntity<Object> response = aiGatewayService.runSimulation(payload);
            long durationMs = (System.nanoTime() - startNs) / 1_000_000;

            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> data = new LinkedHashMap<>();
                data.put("aiResponse", response.getBody());
                data.put("scenarioName", scenarioName);
                data.put("scenarioType", scenarioType);

                return ToolResult.success(getName(), getType())
                        .summary("Simulation completed for scenario: '"
                                + scenarioName + "' (type: " + scenarioType + ").")
                        .data(data)
                        .metadata(Map.of(
                                "httpStatus", response.getStatusCode().value(),
                                "engine", "simulation",
                                "delegatedTo", "AiGatewayService.runSimulation"))
                        .durationMs(durationMs)
                        .executedAt(LocalDateTime.now())
                        .build();
            } else {
                return ToolResult.failure(getName(), getType(),
                        "AI_ENGINE_ERROR",
                        "The WHAT IF engine returned a non-success status: "
                                + response.getStatusCode().value() + ".");
            }

        } catch (Exception ex) {
            log.error("[AgentTool:{}] Error delegating to AiGatewayService", getName(), ex);
            return ToolResult.failure(getName(), getType(),
                    "TOOL_EXECUTION_ERROR",
                    "Failed to invoke simulation engine. It may be temporarily unavailable.");
        }
    }
}
