# MESO AI Foundation Architecture & Scope Report

## 1. Batch Objective & Scope

The purpose of **AI Foundation Batch 1** is to establish a rigorous, audited, and deterministic foundation for the upcoming MESO Intelligence Engines:
1. **Root Cause Engine** — *WHY?* (AI Batch 2)
2. **Forecast Engine** — *WHAT NEXT?* (AI Batch 3)
3. **Simulation Engine** — *WHAT IF?* (AI Batch 4)

In accordance with strict architectural rules, **no model training, LLM integration, or production inference engines were built in this batch**. Instead, the operational foundation was established to ensure that future engines operate on reliable data, reproducible patterns, and well-defined service boundaries.

---

## 2. Key Discoveries from Relational Audit

1. **JPA Constraints & Semantics:**
   * `DailyMenu` enforces a unique constraint on `menuDate` (`@UniqueConstraint(columnNames = "menuDate")`). This guarantees exactly one featured dish per calendar date.
   * `FoodReview` enforces a composite unique constraint on `(user_id, reviewDate)`. A student can evaluate meals at most once per calendar date.
   * `FoodPoll` enforces single active poll state via the `active` boolean column. All 364 historical polls are flagged `active = 0`, preserving the single active poll requirement for the student voting UI.
   * `PollVote` prevents duplicate student voting via `existsByUserIdAndOptionPollId`.
   * `Complaint` descriptions enforce length constraints (minimum 5, maximum 1000 characters), and map to specific categories (`FOOD_QUALITY`, `HYGIENE`, `TIMELINESS`, `FACILITY`, `STAFF_BEHAVIOR`, `OTHER`).

2. **Strict Metric Boundary: Preference vs. Repetition:**
   * **Preference Signal:** Sourced exclusively from `food_polls`, `poll_options`, and `poll_votes`.
   * **Repetition Signal:** Sourced exclusively from `daily_menu` frequency over rolling time windows (7d, 14d, 30d).
   * **Separation Verified:** Synthetic scenario B proves that high repetition can correlate with declining poll preference (fatigue window) OR high poll preference (special feast/exam window), preventing premature algorithmic bias.

---

## 3. What Was Implemented

1. **Schema Audit Documentation:**
   * `docs/AI-DATA-MAP.md`: Full entity, constraint, relationship, and metric mappings.
   * `docs/AI-ARCHITECTURE.md`: Gateway boundaries, trusted execution layers, and explainability contracts.

2. **Synthetic Indian Demo Data Generation System:**
   * `scripts/seed_demo_data.py`: Deterministic, reproducible seeder using fixed random seed (`42`).
   * 250 synthetic Indian students (`users` + `student_profiles`).
   * 365 calendar days of daily menu, reviews, complaints, polls, and votes.
   * 34,901 authentic food ratings, 2,186 complaints, 369 polls, 20,911 poll votes, 125 announcements, and 623 notifications.
   * Scenarios A (Oiliness), B (Repetition vs. Preference), C (Meal-Specific), and D (Temporary Anomaly) cleanly seeded without synthetic cheat columns (`rootCause = OIL`).

3. **FastAPI AI Microservice Skeleton (`ai-service/`):**
   * High-performance asynchronous microservice running on Python 3.14/FastAPI.
   * Strongly typed Pydantic contracts adhering to the 4-tier Explainability Protocol:
     * `Observation`
     * `Evidence`
     * `Possible Factor`
     * `Confidence`
   * Feature engineering pipeline (`FeaturePipeline`) calculating rolling frequency, rating shifts, complaint theme velocity, and poll vote share.
   * NLP Keyword classifier (`ComplaintTopicClassifier`) for complaint theme routing.
   * Engine skeleton interfaces (`RootCauseEngine`, `ForecastEngine`, `SimulationEngine`).
   * Model registry (`ModelRegistry`) and backtesting framework (`BacktestRunner`, `evaluate_calibration_score`).

4. **Production Safety & Environment Isolation:**
   * `src/main/resources/application-demo.properties`: Dedicated demo profile ensuring demo generation cannot run on production.
   * `--confirm-demo` CLI safety guard.

5. **AI Result Persistence Tables:**
   * `src/main/resources/db/ai_schema_foundation.sql`: Clean DDL establishing non-destructive AI result storage (`ai_model_version`, `ai_investigation`, `ai_finding`, `ai_forecast`, `ai_simulation`).

---

## 4. What Was Deliberately NOT Implemented (Rule 28)

To preserve architectural discipline, the following were intentionally deferred:
* ❌ Full Root Cause causal inference engine (deferred to AI Batch 2).
* ❌ Time-series ARIMA/Prophet/LSTM forecasting models (deferred to AI Batch 3).
* ❌ Monte Carlo simulation production algorithms (deferred to AI Batch 4).
* ❌ LLM / OpenAI API integrations (chatbots strictly forbidden).
* ❌ AI Command Center UI (deferred to AI Batch 5).
* ❌ Automated decisions / automatic menu changes (all operational actions remain human-in-the-loop).

---

## 5. Next Steps

With the data foundation, deterministic scenarios, explainability schemas, and service boundaries verified, the platform is ready for:
* **AI Batch 2:** Implementation of the **Root Cause Engine** (`ai-service/app/engines/root_cause.py`), applying statistical causal discovery to detect oil spikes, repetition fatigue, and anomalies.
