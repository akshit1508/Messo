# MESO AI Operations Agent — Phase 5: Controlled Action Execution

## 1. Executive Summary

Phase 5 introduces **Controlled Action Execution** to the MESO AI Operations Agent.
Under this model:
- The Agent cannot unilaterally mutate operational databases or execute real-world actions.
- Gemini is never invoked during execution.
- Action execution strictly requires prior explicit human administrator approval of a validated `ActionBrief`.
- Execution is cryptographically and logically bound to the persisted `ActionBrief` on the `APPROVED` `AgentRun`. Client requests cannot alter or substitute the approved proposal.
- Every action execution is audited in `agent_action_executions` and enforces idempotent double-execution protection.

---

## 2. AgentRun Lifecycle

```
PENDING
   ↓
RUNNING (tool observation, evidence collection, engine analysis)
   ↓
WAITING_FOR_APPROVAL (Action Brief proposal synthesized)
   ↓
   ├─► CANCELLED (Admin Rejection with reason)
   │
   ▼
APPROVED (Admin Approval)
   ↓
ActionExecutionService (Validation, Allowlist check, Idempotency check)
   ↓
   ├─► FAILED (Validation / allowlist failure or error; run marked FAILED)
   │
   ▼
COMPLETED (Domain state updated, execution audit logged)
```

---

## 3. Supported vs. Unsupported Actions

### Supported Actions
The following `ProposedActionType` variants map to the mess operational domain via the new `AgentRecommendation` model:
1. `REVIEW_MENU_CHANGE`: Administrative proposal recommending menu item substitution or revision.
2. `REVIEW_FOOD_ISSUE`: Administrative proposal recommending cafeteria staff kitchen review or recipe adjustment.
3. `REVIEW_STUDENT_FEEDBACK`: Administrative proposal recommending focused student survey or poll.

**Domain Mutation**:
- Creates a structured record in `agent_recommendations` (`status = PENDING_REVIEW`, traceable to `agent_run_id`, `created_by`, `title`, `description`, `suggestedTarget`, `rationale`).
- **Does NOT** mutate `daily_menu`, `foods`, `food_reviews`, `complaints`, or student records. Menu changes remain solely under human control.

### Unsupported Actions
1. `CREATE_ADMIN_FOLLOWUP`: The mess domain does not possess a general task or assignment management entity. Rather than fabricating an artificial task queue, this action is explicitly unsupported.
2. Direct notifications to students or arbitrary users (`send_notification` action tool): Kept non-executing to prevent unsolicited broadcasting.
3. Menu mutations (`delete_menu`, `update_food`, etc.): Strictly excluded from Agent execution.

---

## 4. Architectural Guarantees

### 4.1 Approval Binding
Execution is initiated via:
```http
POST /api/admin/agent/runs/{id}/execute
```
- No request body is accepted for action definition.
- The service loads the persisted `AgentRun` by ID.
- Verifies `status == APPROVED`.
- Parses the persisted `actionBrief` JSON stored on the run entity.
- The approved proposal within the stored `ActionBrief` is the sole source of truth for execution.

### 4.2 Idempotency & Double-Execution Protection
- Database-level unique constraint on `agent_action_executions(agent_run_id)`.
- If `POST /runs/{id}/execute` is called a second time for an already `COMPLETED` run, the service detects the existing execution record and returns an idempotent success response containing the existing outcome without duplicating the action or recommendation.

### 4.3 Transaction Safety
- Executed within `@Transactional` boundaries in `ActionExecutionService`.
- If domain creation or audit logging fails, the transaction rolls back or handles controlled failure, marking `AgentRun.status = FAILED` and recording `failureCode` and `failureReason`.
- An `APPROVED` run is **never** falsely marked `COMPLETED` if execution failed.

### 4.4 Authorization & Security
- Endpoints reside under `/api/admin/**`.
- Require `ROLE_ADMIN` authentication and active CSRF tokens.
- Unauthenticated requests receive HTTP 401; student requests receive HTTP 403; requests without CSRF receive HTTP 403.
- Execution captures the authenticated admin principal (`authentication.getName()`) as `executedBy`.

---

## 5. Audit Trail

Each completed workflow maintains complete bidirectional traceability:
1. **AgentRun**: Investigated goal, target, trigger, timestamps, error codes, and audit trail.
2. **AgentSteps**: Sequential log of tools executed during observation.
3. **ActionBrief**: Structured synthesis (observations, evidence, possible factors, model outputs, proposed action, rationale, assumptions, limitations, and source steps).
4. **Approval**: `approvedBy` and `approvedAt` recorded on `AgentRun`.
5. **AgentActionExecution**: `agentRunId`, `actionType`, `status`, `startedAt`, `completedAt`, `executedBy`, `targetReference`, and `resultSummary`.
6. **AgentRecommendation**: Created domain recommendation linked directly via `agentRunId` and `createdBy`.

---

## 6. Verification Results

All 164 tests pass with 0 failures and 0 errors across the entire test suite:
- Unit tests for `ActionExecutionServiceTest` (10 tests covering approval state validation, cancellation rejection, missing brief, malformed brief, unsupported action type, idempotency, and recommendation creation).
- Security tests in `AgentControllerSecurityTest` (verifying 401 unauthenticated, 403 student, 403 missing CSRF, and 200 admin).
- End-to-end integration test in `AgentEndToEndExecutionTest` (exercising full lifecycle: Investigation $\rightarrow$ WAITING_FOR_APPROVAL $\rightarrow$ APPROVED $\rightarrow$ Action Execution $\rightarrow$ COMPLETED $\rightarrow$ Idempotency re-call).
- All 150 existing tests from Phase 1 through Phase 4 and all existing AI engines (WHY, WHAT NEXT, WHAT IF) remain completely untouched and green.
