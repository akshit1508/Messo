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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Tool adapter: {@code run_root_cause}
 *
 * <p>Invokes the <strong>existing</strong> WHY (Root Cause) engine via
 * {@link AiGatewayService#runInvestigation(Map)}.
 * This adapter is a thin delegation layer — it contains NO statistical logic.
 * All root-cause computation remains in the Python FastAPI root_cause engine.</p>
 *
 * <h3>Accepted input parameters</h3>
 * <ul>
 *   <li>{@code startDate} — required: ISO date (yyyy-MM-dd)</li>
 *   <li>{@code endDate}   — required: ISO date (yyyy-MM-dd)</li>
 * </ul>
 *
 * <h3>What it calls</h3>
 * {@code AiGatewayService.runInvestigation()} → existing {@code /api/v1/investigations}
 * FastAPI endpoint → existing Python root_cause engine.
 *
 * <p>The existing behavior, calculations, and contracts are not modified.</p>
 */
@Component
public class RunRootCauseTool implements AgentTool {

    private static final Logger log = LoggerFactory.getLogger(RunRootCauseTool.class);

    private final AiGatewayService aiGatewayService;

    public RunRootCauseTool(AiGatewayService aiGatewayService) {
        this.aiGatewayService = aiGatewayService;
    }

    @Override
    public String getName() {
        return AgentToolRegistry.RUN_ROOT_CAUSE;
    }

    @Override
    public AgentToolType getType() {
        return AgentToolType.READ_ONLY;
    }

    @Override
    public String getDescription() {
        return "Invoke the existing WHY (Root Cause) engine to investigate rating decline causes. "
             + "Required parameters: startDate (yyyy-MM-dd), endDate (yyyy-MM-dd).";
    }

    @Override
    public ToolResult execute(ToolInput input) {
        long startNs = System.nanoTime();

        // Validate required parameters
        if (!input.has("startDate")) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT", "Parameter 'startDate' is required (yyyy-MM-dd).");
        }
        if (!input.has("endDate")) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT", "Parameter 'endDate' is required (yyyy-MM-dd).");
        }

        LocalDate startDate;
        LocalDate endDate;
        try {
            startDate = LocalDate.parse(input.get("startDate"));
        } catch (DateTimeParseException e) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT", "Parameter 'startDate' must be yyyy-MM-dd format.");
        }
        try {
            endDate = LocalDate.parse(input.get("endDate"));
        } catch (DateTimeParseException e) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT", "Parameter 'endDate' must be yyyy-MM-dd format.");
        }
        if (startDate.isAfter(endDate)) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT", "startDate must not be after endDate.");
        }

        // Build payload — exactly as the existing admin UI does
        Map<String, Object> payload = new HashMap<>();
        payload.put("start_date", startDate.toString());
        payload.put("end_date", endDate.toString());

        try {
            // Delegate to the EXISTING AiGatewayService — no logic duplication
            ResponseEntity<Object> response = aiGatewayService.runInvestigation(payload);
            long durationMs = (System.nanoTime() - startNs) / 1_000_000;

            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> data = new LinkedHashMap<>();
                data.put("aiResponse", response.getBody());
                data.put("dateRange", Map.of(
                        "startDate", startDate.toString(),
                        "endDate", endDate.toString()));

                return ToolResult.success(getName(), getType())
                        .summary("Root cause investigation completed for "
                                + startDate + " to " + endDate + ".")
                        .data(data)
                        .metadata(Map.of(
                                "httpStatus", response.getStatusCode().value(),
                                "engine", "root_cause",
                                "delegatedTo", "AiGatewayService.runInvestigation"))
                        .durationMs(durationMs)
                        .executedAt(LocalDateTime.now())
                        .build();
            } else {
                return ToolResult.failure(getName(), getType(),
                        "AI_ENGINE_ERROR",
                        "The WHY engine returned a non-success status: "
                                + response.getStatusCode().value() + ".");
            }

        } catch (Exception ex) {
            log.error("[AgentTool:{}] Error delegating to AiGatewayService", getName(), ex);
            return ToolResult.failure(getName(), getType(),
                    "TOOL_EXECUTION_ERROR",
                    "Failed to invoke root cause engine. It may be temporarily unavailable.");
        }
    }
}
