# MESO AI Operations Agent — Tool Layer Documentation (Phase 2)

## 1. Tool Architecture Overview

The Agent Tool Layer serves as an additive, secure orchestration abstraction situated above the existing MESO operational repositories and AI engine proxy.

```
AgentRun / AgentStep (Future Orchestration)
   │
   ▼
AgentToolExecutor (Dispatch & Safety Guard)
   ├── Blocks ACTION tools in Phase 2
   ├── Rejects unknown / arbitrary tool names
   └── Enforces structured inputs & outputs
   │
   ▼
AgentTool (Interface)
   │
   ├── [READ_ONLY] GetRecentRatingsTool   ──► FoodRepository (existing)
   ├── [READ_ONLY] GetComplaintsTool       ──► ComplaintRepository (existing)
   ├── [READ_ONLY] GetPollResultsTool      ──► FoodPollRepository & PollVoteRepository (existing)
   ├── [READ_ONLY] GetMenuHistoryTool      ──► DailyMenuRepository (existing)
   │
   ├── [READ_ONLY] RunRootCauseTool        ──► AiGatewayService.runInvestigation() ──► FastAPI WHY engine
   ├── [READ_ONLY] RunForecastTool         ──► AiGatewayService.runForecast()      ──► FastAPI WHAT NEXT engine
   ├── [READ_ONLY] RunSimulationTool       ──► AiGatewayService.runSimulation()    ──► FastAPI WHAT IF engine
   │
   └── [ACTION]    CreateRecommendationTool, CreateAdminTaskTool, SendNotificationTool (Non-executing stubs)
```

---

## 2. Tool Categories & Safety Classification

Every tool belongs to one of two security tiers defined in `AgentToolType`:

1. **`READ_ONLY`**:
   - Observational or analytic capabilities.
   - Guaranteed **never to mutate** databases, schedules, complaints, or student details.
   - May be called autonomously once an Agent orchestrator is introduced.

2. **`ACTION`**:
   - Capabilities designed to alter operational state (creating tasks, publishing recommendations, notifying users).
   - **Strictly blocked in Phase 2**. Any execution attempt returns `ACTION_EXECUTION_BLOCKED`.
   - Reserved for human-approval gates in subsequent phases.

---

## 3. Tool Contracts & Existing System Mapping

| Tool Name | Type | Target System / Service Called | Purpose |
|---|---|---|---|
| `get_recent_ratings` | `READ_ONLY` | `FoodRepository.getFoodAnalytics()` | Retrieves rating averages and review counts per food item. |
| `get_complaints` | `READ_ONLY` | `ComplaintRepository.findAll(...)` | Retrieves student complaints with filtering on resolved status, type, and pagination limits. |
| `get_poll_results` | `READ_ONLY` | `FoodPollRepository` & `PollVoteRepository` | Retrieves active or specific poll options and vote tallies. |
| `get_menu_history` | `READ_ONLY` | `DailyMenuRepository.findAll(...)` | Retrieves historical daily menu items within optional date windows. |
| `run_root_cause` | `READ_ONLY` | `AiGatewayService.runInvestigation()` | Delegates to the existing Python FastAPI WHY (Root Cause) engine. |
| `run_forecast` | `READ_ONLY` | `AiGatewayService.runForecast()` | Delegates to the existing Python FastAPI WHAT NEXT (Forecast) engine. |
| `run_simulation` | `READ_ONLY` | `AiGatewayService.runSimulation()` | Delegates to the existing Python FastAPI WHAT IF (Simulation) engine. |
| `create_recommendation` | `ACTION` | None (Stub) | Contract for creating operational recommendations. Rejects execution. |
| `create_admin_task` | `ACTION` | None (Stub) | Contract for creating admin action items. Rejects execution. |
| `send_notification` | `ACTION` | None (Stub) | Contract for sending push/in-app notifications. Rejects execution. |

---

## 4. Read-Only Guarantees

- All data-access tools execute under read-only transactions (`@Transactional(readOnly = true)`).
- Tools access pre-existing repository methods or derived read queries. No `save`, `delete`, or modifying queries are invoked.
- Operational database tables (`foods`, `food_reviews`, `complaints`, `food_polls`, `poll_votes`, `daily_menu`, `users`, `student_profiles`) remain completely unmutated.

---

## 5. Action Tool Restrictions

- In Phase 2, `create_recommendation`, `create_admin_task`, and `send_notification` are non-executing stubs.
- Both the tool implementation itself and the `AgentToolExecutor` reject execution requests immediately.
- Attempting to call an `ACTION` tool yields an `ACTION_EXECUTION_BLOCKED` error code with a clear explanation that human approval is required.

---

## 6. Input Validation & Error Handling

- **No Raw SQL / Reflection:** Tools are mapped strictly by name from a predefined immutable registry map. No dynamic reflection or method invocation occurs from client inputs.
- **Input Constraints:** Handled via `ToolInput` which limits parameter sizes and string lengths to prevent payload abuse.
- **Sanitized Errors:**
  - AI engine connection drops or 5xx responses produce clean `AI_ENGINE_ERROR` or `TOOL_EXECUTION_ERROR` messages.
  - Zero internal stack traces, DB credentials, or environment paths are returned to the caller.

---

## 7. Security Model & API

- Endpoint: `POST /api/admin/agent/tools/{toolName}/execute`
- **Authentication**: Inherits `/api/admin/**` rules from `SecurityConfig` requiring `ROLE_ADMIN`. Unauthenticated requests yield `401 Unauthorized`; non-admin roles (e.g. `ROLE_STUDENT`) yield `403 Forbidden`.
- **CSRF Protection**: All mutating HTTP methods (`POST`) enforce CSRF validation.

---

## 8. Phase 2 Limitations

- **No Autonomous Planning**: The agent does not choose sequences of tools autonomously yet.
- **No Gemini Integration**: No LLM reasoning or prompt templates are present in this phase.
- **No Direct Action Execution**: Operational modifications remain locked.

---

## 9. Phase 3 Roadmap

- Connect the Agent Planner to drive ordered `AgentStep` sequences.
- Introduce Gemini LLM reasoning for root cause interpretation and scenario proposals.
- Implement the Human-in-the-Loop approval gate for `ACTION` tools.
- Add admin dashboard UI to view step telemetry and approve/reject proposed actions.
