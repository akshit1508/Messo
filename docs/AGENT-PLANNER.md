# MESO AI Operations Agent — Planner & Orchestration Architecture (Phase 3A)

## 1. Planner Architecture Overview

Phase 3A implements the orchestration and planning layer for the MESO AI Operations Agent. The Agent acts as an orchestrator, sequencing and dispatching allowed tools across operational repositories and pre-existing AI microservices.

```
Admin Client (Initiates Goal)
   │
   ▼
AgentService.startInvestigation(runId)
   │
   ▼
AgentOrchestratorService (The Orchestrator Loop)
   ├── Enforces hard limit MAX_STEPS (default 6)
   ├── Detects and prevents duplicate tool loops
   ├── Transitions AgentRun: PENDING ──► RUNNING ──► COMPLETED / FAILED
   ├── Persists AgentStep at every iteration
   └── Synthesizes final AgentInvestigationResult
   │
   ▼
AgentPlannerEngine (Reasoning & Decision Layer)
   ├── GeminiAgentPlannerEngine (LLM Reasoning with strict JSON schema)
   └── Deterministic Fallback Sequence (when GEMINI_API_KEY is not configured or offline)
   │
   ▼
PlannerDecision (CALL_TOOL, COMPLETE, or FAIL)
   │
   ▼
AgentToolExecutor.execute(toolName, validatedInput)
   ├── Strictly validates against ALLOWED_TOOLS
   ├── Blocks ACTION tools
   └── Returns structured ToolResult
```

---

## 2. Gemini's Exact Responsibility vs. Existing AI Engines

### What Gemini DOES:
- Reasons over structured investigation context (goal, parameters, prior step summaries).
- Chooses the next appropriate tool from the explicitly registered tool allowlist.
- Explains the operational rationale behind the next step (`reasoningSummary`).
- Determines when sufficient evidence has been collected to conclude the investigation.

### What Gemini NEVER DOES:
- Performs numerical forecasting or predictive math.
- Calculates Welch t-tests, p-values, or statistical significance.
- Runs Monte Carlo simulations or confidence interval algorithms.
- Modifies or computes satisfaction ratings or complaint aggregations.
- Replaces or overrides the output of the existing Python WHY, WHAT NEXT, or WHAT IF engines.

> **Rule:** Existing AI engines remain the sole authoritative source of model computations. Gemini only consumes their structured outputs.

---

## 3. Tool-Selection Flow & Allowed Tools

### Executable Tools in Phase 3A:
- **`get_recent_ratings`** (READ_ONLY): Operational rating analytics per food item.
- **`get_complaints`** (READ_ONLY): Student complaint records and categories.
- **`get_poll_results`** (READ_ONLY): Active or historical student food poll results.
- **`get_menu_history`** (READ_ONLY): Historical daily menus.
- **`run_root_cause`** (READ_ONLY AI): Authoritative WHY engine invocation via `AiGatewayService`.
- **`run_forecast`** (READ_ONLY AI): Authoritative WHAT NEXT engine invocation via `AiGatewayService`.
- **`run_simulation`** (READ_ONLY AI): Authoritative WHAT IF engine invocation via `AiGatewayService`.

### Blocked Tools:
- `create_recommendation`, `create_admin_task`, `send_notification` remain strictly blocked. Any attempt by the planner to select them results in an immediate `UNAUTHORIZED_TOOL` run failure.

---

## 4. Tool Validation & Safety Guardrails

1. **No Reflection / Dynamic Invocation:** Tool names are matched against a static `Set<String>` constant.
2. **Duplicate Tool Call Protection:** Each tool call is fingerprinted (`toolName:sortedParams`). If the planner calls the exact same tool and parameter configuration twice in a run, the loop terminates safely rather than spinning indefinitely.
3. **Step Limits (`MAX_STEPS`):** Configurable hard ceiling (default 6). If the investigation has not reached completion within the threshold, the run transitions to `FAILED` with `failureCode = STEP_LIMIT_EXCEEDED`.

---

## 5. AgentRun Lifecycle & Step Persistence

- **PENDING**: Run created via `POST /api/admin/agent/runs`.
- **RUNNING**: Run started via `POST /api/admin/agent/runs/{id}/start`.
- **COMPLETED**: Planner emitted `COMPLETE`, or safe duplicate guard concluded investigation. Final result persisted in `agent_run.final_result`.
- **FAILED**: Step limit reached, unauthorized tool requested, or unrecoverable error. Populated with `failure_code` and `failure_reason`.

For each executed step, an `AgentStep` entity is persisted capturing:
- `sequence_order`
- `tool_name` & `tool_type`
- `status` (`RUNNING` ──► `COMPLETED` / `FAILED`)
- `started_at` & `completed_at`
- `input_summary` (sanitized JSON parameters)
- `output_summary` (sanitized result overview)

---

## 6. Final Agent Investigation Result

When an investigation completes, the outcome is structured as an `AgentInvestigationResult` record and persisted as JSON:
- **`observations`**: Empirical facts from operational ratings and menus.
- **`evidence`**: Signals from complaints and poll tallies.
- **`possibleFactors`**: Causal hypotheses identified for review.
- **`modelOutputs`**: Findings directly from WHY / WHAT NEXT / WHAT IF engines.
- **`reasoningSummary`**: Cohesive narrative summarizing the findings without speculative leaps.

---

## 7. Data Minimization & Security

- **Server-Side API Key:** Configured via `GEMINI_API_KEY` environment variable or `app.gemini.api-key` in `application.properties`.
- **No Client Exposure:** API keys are never included in responses, logs, or client-accessible metadata.
- **No PII:** Student personal data (names, student IDs, hostel rooms) are stripped prior to passing context to the planning engine.
- **Authentication:** All `/api/admin/agent/**` endpoints require `ROLE_ADMIN` and CSRF tokens.

---

## 8. What Phase 3A Does NOT Support (Roadmap)

- **Phase 3B / Phase 4**:
  - Human-in-the-Loop approval workflows for proposed ACTION tools (`create_recommendation`, etc.).
  - Agent UI dashboard with real-time step visualization.
  - Autonomous operational changes.
