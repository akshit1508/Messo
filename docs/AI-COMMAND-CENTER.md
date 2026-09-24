# MESO Admin Intelligence Command Center & AI Gateway

## 1. Executive Summary

The **MESO Admin Intelligence Command Center** (`/admin/intelligence`) is an analytical executive interface designed for hostel mess administrators. It synthesizes three core machine learning and statistical engines into an operational decision-support cockpit:

1. **Root Cause Diagnostics (WHY?):** Detects measurable shifts in food satisfaction or complaint volume, tests for statistical significance ($p < 0.05$), and isolates ranked contributing factors with traceable empirical evidence.
2. **Probabilistic Forecasting (WHAT NEXT?):** Predicts future satisfaction trajectories across multi-day horizons using a Gradient Boosting Regressor (60 trees, learning rate 0.08, max depth 3) with calibrated **90% Prediction Intervals**, achieving a **27.3% MAE error reduction** over rolling EWMA baselines on 12 months of synthetic student-style reviews.
3. **What-If Scenario Simulation (WHAT IF?):** Tests menu substitutions, serving interval adjustments, and combo dish changes in a virtual state. It performs 1,000 paired common-shock Monte Carlo runs to evaluate percentile spreads ($P_{10}, P_{50}, P_{90}$) and probability of rating drops while guaranteeing zero mutation of operational tables.

---

## 2. End-to-End System Architecture

```
+-------------------------------------------------------------------------+
|                  Next.js 14 Admin Frontend UI                           |
|                  URL: /admin/intelligence                               |
|                  Authentication: Cookie-based (JSESSIONID)              |
|                  CSRF Protection: X-XSRF-TOKEN                          |
+------------------------------------+------------------------------------+
                                     |
                                     | Authenticated REST (HTTP/JSON)
                                     v
+-------------------------------------------------------------------------+
|                Spring Boot 3.2.5 Application Gateway                   |
|                Controller: AdminAiApiController                         |
|                Service: AiGatewayService (RestClient, 10s timeout)      |
|                Access Control: hasRole("ADMIN")                         |
+------------------+----------------------------------+-------------------+
                   |                                  |
                   | JPA / JDBC                       | Internal HTTP Proxy
                   v                                  v
+----------------------------------+   +----------------------------------+
|           MySQL Database         |   |     FastAPI Python AI Service    |
|   Operational Tables:            |   |     Port: 8000 (Internal Only)   |
|   - daily_menu                   |   |     Engines:                     |
|   - foods                        |   |     - Root Cause Engine          |
|   - food_reviews                 |   |     - Forecast Engine            |
|   - complaints                   |   |     - Simulation Engine          |
|   - food_polls, poll_votes       |   |     - Feature Pipeline           |
|                                  |   +----------------------------------+
|   AI Audit Tables:               |
|   - ai_simulation                |
|   - ai_investigation             |
|   - ai_forecast                  |
+----------------------------------+
```

### Key Architectural Guarantees:
- **No Direct Browser Access:** Web browsers cannot reach the Python AI microservice directly. All calls flow through the Spring Boot API Gateway (`/api/admin/ai/*`).
- **Session-Based Authentication Retained:** No JWT tokens were introduced. The gateway leverages existing Spring Security sessions (`JSESSIONID`) and CSRF tokens.
- **Zero Operational Mutation:** Simulations operate strictly on virtual feature snapshots and never alter `daily_menu`, `foods`, `food_reviews`, `complaints`, or `food_polls`. Simulation runs are non-intrusively recorded in `ai_simulation`.

---

## 3. Spring Boot AI Gateway API Endpoints

All endpoints are mapped under `/api/admin/ai/**` and secured with `hasRole("ADMIN")`.

| HTTP Method | Spring Boot Gateway Endpoint | FastAPI Destination | Description |
|:---|:---|:---|:---|
| `POST` | `/api/admin/ai/investigations` | `POST /api/v1/investigations` | Runs Root Cause diagnostic across a date window |
| `POST` | `/api/admin/ai/forecasts` | `POST /api/v1/forecasts` | Generates point & 90% prediction interval forecast |
| `POST` | `/api/admin/ai/simulations` | `POST /api/v1/simulations` | Executes paired Monte Carlo what-if simulation |
| `GET` | `/api/admin/ai/simulations/history` | `GET /api/v1/simulations/history?limit={n}` | Retrieves past simulation audit records |
| `GET` | `/api/admin/ai/foods` | `GET /api/v1/simulations/foods` | Retrieves valid food catalog for scenario building |

---

## 4. UI/UX Specifications

The command center follows a high-density, analytical SaaS layout:

1. **Top KPI Summary Cards:**
   - **Current Benchmark Rating:** 7-day rolling average food rating.
   - **Forecasted Horizon:** Projected satisfaction for upcoming serving with 90% Prediction Interval.
   - **Model Accuracy Benchmark:** 27.3% MAE error reduction over baseline EWMA.
   - **Simulation Safety Badge:** Confirmation of zero operational mutation and audit persistence.
2. **Three Interactive Tabs:**
   - **Root Cause Engine (WHY?):** Problem window selector, statistical significance badge ($p$-value), direct factual observations, ranked contributing factors with calibrated confidence bars, and traceable empirical evidence table.
   - **Forecast Engine (WHAT NEXT?):** Food catalog picker, meal type filter, 7/14 day horizon selector, point forecast with 90% Prediction Interval, top feature driver importances, and day-by-day trajectory table.
   - **Simulation Engine (WHAT IF?):** Visual scenario builder (Food Replacement, Repetition Spacing, Meal Combinations), side-by-side Baseline vs Proposed projection, Monte Carlo uncertainty distribution ($P_{10}, P_{25}, P_{50}, P_{75}, P_{90}$), paired delta distribution spread, probability of improvement vs drop, causal language safety notice, and historical audit log table.
