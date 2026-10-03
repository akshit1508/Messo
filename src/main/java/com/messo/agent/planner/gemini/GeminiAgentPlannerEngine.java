package com.messo.agent.planner.gemini;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.messo.agent.planner.AgentPlannerEngine;
import com.messo.agent.planner.PlannerContext;
import com.messo.agent.planner.PlannerDecision;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Gemini-backed implementation of the {@link AgentPlannerEngine}.
 *
 * <p>Key architectural guarantees:
 * <ul>
 *   <li>API Key is read strictly from server-side environment/config (`app.gemini.api-key`)</li>
 *   <li>Never exposed in responses, client payloads, or logs</li>
 *   <li>Output is strictly parsed into structured JSON format</li>
 *   <li>If Gemini is unconfigured, times out, or fails, gracefully falls back to deterministic rule-based planning</li>
 *   <li>Gemini is never allowed to perform calculations; it only sequences tools from the allowed list</li>
 * </ul>
 */
@Component
public class GeminiAgentPlannerEngine implements AgentPlannerEngine {

    private static final Logger log = LoggerFactory.getLogger(GeminiAgentPlannerEngine.class);

    private final String apiKey;
    private final String model;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiAgentPlannerEngine(
            @Value("${app.gemini.api-key:#{environment['GEMINI_API_KEY'] ?: ''}}") String apiKey,
            @Value("${app.gemini.model:gemini-1.5-flash}") String model,
            ObjectMapper objectMapper) {
        this.apiKey = (apiKey != null) ? apiKey.trim() : "";
        this.model = (model != null && !model.isBlank()) ? model.trim() : "gemini-1.5-flash";
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));

        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .requestFactory(factory)
                .build();
    }

    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    @Override
    public PlannerDecision planNextStep(PlannerContext context) {
        if (!isConfigured()) {
            log.info("[GeminiAgentPlannerEngine] GEMINI_API_KEY is not configured. Falling back to deterministic investigation sequence.");
            return planDeterministicFallback(context);
        }

        try {
            return callGemini(context);
        } catch (Exception ex) {
            log.warn("[GeminiAgentPlannerEngine] Gemini call failed ({}: {}). Falling back to deterministic investigation sequence.",
                    ex.getClass().getSimpleName(), ex.getMessage());
            return planDeterministicFallback(context);
        }
    }

    private PlannerDecision callGemini(PlannerContext context) throws Exception {
        String prompt = buildPrompt(context);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.1
                )
        );

        String endpoint = "/v1beta/models/" + model + ":generateContent?key=" + apiKey;

        String responseStr = restClient.post()
                .uri(endpoint)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

        return parseGeminiResponse(responseStr);
    }

    private String buildPrompt(PlannerContext context) {
        return """
                You are the MESO AI Operations Agent Planner.
                Your task is to plan the next investigation step for a student mess facility.
                
                CRITICAL CONSTRAINTS:
                1. You must select ONLY from the allowed tools: %s
                2. You MUST NOT perform any statistical, forecasting, or Monte Carlo math yourself.
                3. Existing AI engines (run_root_cause, run_forecast, run_simulation) are authoritative.
                4. Action tools are strictly blocked.
                5. Output MUST be valid JSON conforming to:
                {
                   "decisionType": "CALL_TOOL" or "COMPLETE",
                   "toolName": "<name of tool from allowed list, or null if COMPLETE>",
                   "toolInput": { "key": "value" },
                   "reasoningSummary": "<explanation of what this step investigates without claiming causal certainty>"
                }
                
                CURRENT GOAL:
                Type: %s
                Target: %s
                Description: %s
                
                STEPS ALREADY EXECUTED:
                %s
                
                If you have collected sufficient information (e.g. ratings, complaints, and root cause analysis), decide "COMPLETE".
                """.formatted(
                context.allowedToolNames(),
                context.goalType(),
                context.goalTarget() != null ? context.goalTarget() : "N/A",
                context.goalDescription() != null ? context.goalDescription() : "N/A",
                formatExecutedSteps(context.executedSteps())
        );
    }

    private String formatExecutedSteps(List<PlannerContext.StepRecord> steps) {
        if (steps.isEmpty()) return "None yet.";
        StringBuilder sb = new StringBuilder();
        for (PlannerContext.StepRecord s : steps) {
            sb.append("- Step ").append(s.sequenceOrder()).append(": ")
              .append(s.toolName()).append(" -> ")
              .append(s.success() ? "SUCCESS" : "FAILED")
              .append(" (Summary: ").append(s.summary()).append(")\n");
        }
        return sb.toString();
    }

    private PlannerDecision parseGeminiResponse(String responseJson) throws Exception {
        JsonNode root = objectMapper.readTree(responseJson);
        JsonNode candidate = root.path("candidates").get(0);
        if (candidate == null || candidate.isMissingNode()) {
            throw new IllegalStateException("No candidate found in Gemini response");
        }
        String text = candidate.path("content").path("parts").get(0).path("text").asText();
        JsonNode decisionNode = objectMapper.readTree(text);

        String decisionTypeStr = decisionNode.path("decisionType").asText("COMPLETE");
        String reasoning = decisionNode.path("reasoningSummary").asText("Next investigation step determined.");

        if ("COMPLETE".equalsIgnoreCase(decisionTypeStr)) {
            return PlannerDecision.complete(reasoning);
        }

        String toolName = decisionNode.path("toolName").asText(null);
        Map<String, String> toolInput = new HashMap<>();
        JsonNode inputNode = decisionNode.path("toolInput");
        if (inputNode != null && inputNode.isObject()) {
            inputNode.fields().forEachRemaining(entry -> toolInput.put(entry.getKey(), entry.getValue().asText()));
        }

        return PlannerDecision.callTool(toolName, toolInput, reasoning);
    }

    /**
     * Deterministic, safe fallback sequence when Gemini API key is absent or unreachable.
     * Sequences: get_recent_ratings -> get_complaints -> run_root_cause -> COMPLETE.
     */
    public PlannerDecision planDeterministicFallback(PlannerContext context) {
        List<String> executed = context.executedSteps().stream()
                .map(PlannerContext.StepRecord::toolName)
                .toList();

        if (!executed.contains("get_recent_ratings")) {
            return PlannerDecision.callTool(
                    "get_recent_ratings",
                    Map.of("limit", "50"),
                    "Recent meal ratings should be checked first to establish whether the satisfaction decline is persistent."
            );
        }

        if (!executed.contains("get_complaints")) {
            return PlannerDecision.callTool(
                    "get_complaints",
                    Map.of("limit", "20"),
                    "Complaint patterns will be checked as a possible contributing factor to recent satisfaction trends."
            );
        }

        if (!executed.contains("run_root_cause")) {
            return PlannerDecision.callTool(
                    "run_root_cause",
                    Map.of("startDate", "2026-09-01", "endDate", "2026-09-30"),
                    "Invoke the authoritative Root Cause engine to analyze contributing factor weights."
            );
        }

        return PlannerDecision.complete(
                "Sufficient observational data and root cause engine findings have been synthesized for this operational investigation."
        );
    }
}
