# MESO AI Operations Agent — Action Brief & Approval Architecture (Phase 4)

## 1. Action Brief Architecture Overview

Phase 4 establishes the bridge between investigation conclusion and human-in-the-loop operational oversight. Upon completing an evidence-backed investigation, the Agent synthesizes a structured, human-readable **Action Brief** and immediately pauses in `WAITING_FOR_APPROVAL` status.

```
Investigation Complete (Evidence & Engine Findings)
   │
   ▼
ActionBriefService.generateActionBrief(...)
   ├── Enforces semantic separation (OBSERVATION vs EVIDENCE vs FACTORS vs MODEL vs ACTION)
   ├── Verifies source step traceability against actual executed steps
   └── Employs Gemini reasoning with 100% reliable deterministic fallback
   │
   ▼
AgentRun Status: WAITING_FOR_APPROVAL (approvalRequired = true)
   │
   ├───────────────────────────────┬───────────────────────────────┐
   ▼                               ▼                               ▼
GET /api/admin/agent/runs/{id}  POST /runs/{id}/approve         POST /runs/{id}/reject
(Review brief & audit trail)    (Human approves proposal)       (Human rejects proposal)
                                   │                               │
                                   ▼                               ▼
                                COMPLETED                       CANCELLED
                                (Approved & audited)            (Rejection audited)
                                   │
                                   ▼
                        [Phase 5 Action Execution]
```

---

## 2. Structured Action Brief Model

The Action Brief is an immutable record adhering to strict semantic categories:

```json
{
  "title": "Action Brief: Dinner Satisfaction Review",
  "summary": "Structured investigation completed for INVESTIGATE_OPERATIONAL_ISSUE. Evidence gathered across operational metrics and model outputs.",
  "observations": [
    "Direct rating metric variation observed during selected operational period."
  ],
  "evidence": [
    "Operational feedback records and student trend data logged during the period."
  ],
  "possibleFactors": [
    "Food preparation consistency and complaint patterns may be contributing factors."
  ],
  "modelOutputs": [
    "Root Cause and Forecast model analyses recorded."
  ],
  "proposedAction": {
    "type": "REVIEW_MENU_CHANGE",
    "description": "Review alternative menu selections and preparation standards with the mess administration team.",
    "suggestedTarget": "Dinner Menu"
  },
  "rationale": "Analysis of recent ratings and complaint themes suggests reviewing alternative meal items may improve student satisfaction.",
  "assumptions": [
    "Historical rating trends remain representative of student preferences.",
    "Model projections assume operating conditions remain consistent."
  ],
  "limitations": [
    "Correlation in feedback does not confirm direct causation.",
    "Model outputs and simulations represent projections rather than guaranteed outcomes."
  ],
  "sourceSteps": [1, 2, 3],
  "generatedAt": "2026-10-03T16:21:00",
  "status": "WAITING_FOR_APPROVAL"
}
```

---

## 3. Mandatory Semantic Separation

To prevent misleading claims or algorithmic overconfidence, the schema strictly segregates:

1. **OBSERVATION**: Direct, empirical facts observed in operational data (e.g., *"Dinner ratings declined from 4.2 to 2.8"*).
2. **EVIDENCE**: Data points supporting the observation (e.g., *"15 student complaints logged regarding spice consistency"*).
3. **POSSIBLE FACTOR**: Hypotheses or contributing factors without claiming absolute causation (e.g., *"Spice consistency may be related to observed satisfaction patterns"*). **Never claims *"Complaints caused the drop"***.
4. **MODEL OUTPUT**: Verbatim projections from existing engines (e.g., *"Root Cause Engine identified spice level anomaly (p < 0.05)"*).
5. **PROPOSED ACTION**: Recommendations for human operators to consider.
6. **ASSUMPTIONS & LIMITATIONS**: Contextual boundaries clarifying that model projections are estimates under assumptions, not guarantees.

---

## 4. Controlled Action Types

Proposals are classified under the `ProposedActionType` enum:
- **`REVIEW_MENU_CHANGE`**: Propose reviewing potential recipe or menu item substitutions.
- **`REVIEW_FOOD_ISSUE`**: Propose examining food preparation or consistency standards.
- **`REVIEW_STUDENT_FEEDBACK`**: Propose polling students or conducting feedback review.
- **`CREATE_ADMIN_FOLLOWUP`**: Propose administrative staff follow-up on canteen operations.

> **Safety Rule:** These classifications represent proposals only. No actions are executed in Phase 4.

---

## 5. Source-Step Traceability

Every Action Brief contains a `sourceSteps` array that maps claims directly back to the `AgentStep.sequenceOrder` records executed during the run.
- Unreferenced or manufactured steps are filtered out before persistence.
- Reviewers can inspect the exact tool, parameters, and database query that produced each piece of evidence.

---

## 6. Human Approval & Audit Lifecycle

### Lifecycle States:
```
PENDING ──► RUNNING ──► WAITING_FOR_APPROVAL ──► COMPLETED (Approved) / CANCELLED (Rejected)
```

### Endpoints:
- `POST /api/admin/agent/runs/{id}/approve`
  - Validates that the run is in `WAITING_FOR_APPROVAL`.
  - Records `approvedBy` (admin email from security principal), `approvedAt` (timestamp), sets `approvalRequired = false`.
  - Transitions status to `COMPLETED`.
  - **Does NOT execute any operational action.**
- `POST /api/admin/agent/runs/{id}/reject`
  - Validates that the run is in `WAITING_FOR_APPROVAL`.
  - Records `rejectedBy`, `rejectedAt`, and `rejectionReason`.
  - Transitions status to `CANCELLED`.

---

## 7. Security Model & RBAC

- **Authentication**: Endpoints reside under `/api/admin/**` requiring `ROLE_ADMIN`.
- **RBAC**: Students receive `403 Forbidden`. Unauthenticated requests receive `401 Unauthorized`.
- **CSRF Protection**: All mutating POST endpoints enforce standard Spring Security CSRF tokens.
- **Audit Logging**: All approvals and rejections are permanently recorded on the `AgentRun` entity with administrator email and timestamp.

---

## 8. Why Approval Does NOT Execute Actions in Phase 4

Phase 4 establishes the governance and human review checkpoint. Decoupling proposal review from execution ensures:
1. Operational systems remain completely isolated from unintended mutations.
2. Reviewers have full auditability and confidence in the proposal structure before execution mechanisms are introduced.
3. Actual tool execution (`create_recommendation`, `create_admin_task`, `send_notification`) is reserved for Phase 5.
