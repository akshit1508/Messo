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
 * Tool adapter: {@code run_forecast}
 *
 * <p>Invokes the <strong>existing</strong> WHAT NEXT (Forecast) engine via
 * {@link AiGatewayService#runForecast(Map)}.
 * This adapter is a thin delegation layer — it contains NO forecasting logic.
 * All prediction computation remains in the Python FastAPI forecast engine.</p>
 *
 * <h3>Accepted input parameters</h3>
 * <ul>
 *   <li>{@code foodName}    — required: name of the food item to forecast</li>
 *   <li>{@code forecastDate} — optional: ISO date (yyyy-MM-dd) for the target date</li>
 *   <li>{@code horizonDays} — optional: number of forecast days (positive integer)</li>
 * </ul>
 *
 * <h3>What it calls</h3>
 * {@code AiGatewayService.runForecast()} → existing {@code /api/v1/forecasts}
 * FastAPI endpoint → existing Python forecast engine.
 *
 * <p>The existing behavior, model calculations, and contracts are not modified.</p>
 */
@Component
public class RunForecastTool implements AgentTool {

    private static final Logger log = LoggerFactory.getLogger(RunForecastTool.class);

    private final AiGatewayService aiGatewayService;

    public RunForecastTool(AiGatewayService aiGatewayService) {
        this.aiGatewayService = aiGatewayService;
    }

    @Override
    public String getName() {
        return AgentToolRegistry.RUN_FORECAST;
    }

    @Override
    public AgentToolType getType() {
        return AgentToolType.READ_ONLY;
    }

    @Override
    public String getDescription() {
        return "Invoke the existing WHAT NEXT (Forecast) engine to predict future ratings or demand. "
             + "Required: foodName. Optional: forecastDate (yyyy-MM-dd), horizonDays (integer).";
    }

    @Override
    public ToolResult execute(ToolInput input) {
        long startNs = System.nanoTime();

        // Validate required parameter
        if (!input.has("foodName")) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT", "Parameter 'foodName' is required.");
        }
        String foodName = input.get("foodName").trim();
        if (foodName.isEmpty()) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT", "Parameter 'foodName' must not be blank.");
        }

        // Validate optional horizonDays
        if (input.has("horizonDays")) {
            int horizonDays = input.getInt("horizonDays", -1);
            if (horizonDays < 1 || horizonDays > 365) {
                return ToolResult.failure(getName(), getType(),
                        "INVALID_INPUT",
                        "Parameter 'horizonDays' must be between 1 and 365. Got: "
                                + input.get("horizonDays"));
            }
        }

        // Build payload — mirror the format expected by the existing AI service
        Map<String, Object> payload = new HashMap<>();
        payload.put("food_name", foodName);
        if (input.has("forecastDate")) {
            payload.put("forecast_date", input.get("forecastDate").trim());
        }
        if (input.has("horizonDays")) {
            payload.put("horizon_days", input.getInt("horizonDays", 7));
        }

        try {
            // Delegate to the EXISTING AiGatewayService — no logic duplication
            ResponseEntity<Object> response = aiGatewayService.runForecast(payload);
            long durationMs = (System.nanoTime() - startNs) / 1_000_000;

            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> data = new LinkedHashMap<>();
                data.put("aiResponse", response.getBody());
                data.put("foodName", foodName);

                return ToolResult.success(getName(), getType())
                        .summary("Forecast generated for food item: '" + foodName + "'.")
                        .data(data)
                        .metadata(Map.of(
                                "httpStatus", response.getStatusCode().value(),
                                "engine", "forecast",
                                "delegatedTo", "AiGatewayService.runForecast"))
                        .durationMs(durationMs)
                        .executedAt(LocalDateTime.now())
                        .build();
            } else {
                return ToolResult.failure(getName(), getType(),
                        "AI_ENGINE_ERROR",
                        "The WHAT NEXT engine returned a non-success status: "
                                + response.getStatusCode().value() + ".");
            }

        } catch (Exception ex) {
            log.error("[AgentTool:{}] Error delegating to AiGatewayService", getName(), ex);
            return ToolResult.failure(getName(), getType(),
                    "TOOL_EXECUTION_ERROR",
                    "Failed to invoke forecast engine. It may be temporarily unavailable.");
        }
    }
}
