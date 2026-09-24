# MESO AI Architecture & System Boundaries

## 1. System Context & Overview

MESO is an enterprise hostel mess management platform comprising a Java Spring Boot backend, a MySQL persistence tier, a Next.js 14 frontend, and an auxiliary Python FastAPI AI microservice.

```
+---------------------------------------------------------------+
|                      Next.js Frontend                        |
|  - Student Web UI (/student/*)                                |
|  - Admin Web UI (/admin/*)                                    |
|  - AI Command Center (Future Phase)                           |
+-------------------------------+-------------------------------+
                                |
                                | REST / JSON (Authenticated Session / Cookie)
                                v
+---------------------------------------------------------------+
|                   Spring Boot Application                     |
|                   (The Trusted Gateway)                       |
|  - Spring Security 6 (Session & AuthZ enforcement)            |
|  - Domain Business Logic (Menu, Ratings, Polls, Complaints)   |
|  - AI Gateway Proxy / Client (Service-to-Service communication) |
|  - AI Result Persistence (`ai_investigation`, `ai_forecast`)  |
+---------------+-------------------------------+---------------+
                |                               |
                | JDBC / JPA                    | Internal HTTP (mTLS / Shared Secret)
                v                               v
+-------------------------------+   +---------------------------+
|          MySQL DB             |   |      FastAPI AI Service   |
|  - Core Domain Tables         |   |  - Root Cause Engine      |
|  - Read Replicas (Optional)   |   |  - Forecast Engine        |
|  - AI Result Tables           |   |  - Simulation Engine      |
+-------------------------------+   |  - Feature Pipeline       |
                                    |  - NLP Topic Classifier   |
                                    +---------------------------+
```

---

## 2. Hard Architectural Boundaries

### 2.1 Spring Boot as the Trusted Gateway
1. **Zero Direct Client Exposure:** The FastAPI AI service is **NEVER** exposed directly to public clients or browsers. It operates on an internal private network or loopback port (e.g. `http://localhost:8000`).
2. **Authentication & Authorization Authority:** All incoming requests are authenticated by Spring Boot. Role-based access control (e.g., only `ROLE_ADMIN` can trigger investigations or simulations) is strictly enforced in Spring Boot before any call is dispatched to FastAPI.
3. **Auditability & Persistence:** AI responses (investigations, forecasts, simulations) returned by FastAPI are stored in MySQL through Spring Boot JPA repositories, ensuring transaction safety and audit trails.

### 2.2 FastAPI Microservice Role
1. **Stateless Computation:** The AI service focuses on heavy statistical modeling, feature extraction, causal inference, and natural language processing.
2. **Separation of Reasoning Layers:**
   * **Observation:** Raw metric shifts detected in data (e.g., "Dinner ratings dropped from 4.1 to 2.8").
   * **Evidence:** Empirical correlations and data points (e.g., "Dal Tadka was served 5 times in 7 days; 38 oil-related complaints filed").
   * **Possible Factors:** Probabilistic causal drivers ranked by confidence (e.g., "Excessive oiliness in evening dal preparations, confidence: 84%").
   * **Confidence:** Numerical score representing certainty based on data sample size and statistical significance.
3. **No Direct Production Database Mutation:** The AI service performs read queries or consumes feature snapshots; it **never** alters core business entities (`daily_menu`, `users`, `food_reviews`, `poll_votes`). All operational actions remain human-in-the-loop decisions executed by Admin users.

---

## 3. Communication Protocol & Contracts

* **Protocol:** HTTP/1.1 REST with JSON payloads over internal network.
* **Payload Structure:** Fully typed Pydantic models in FastAPI matching Java DTOs in Spring Boot.
* **Timeout & Fallback:** Spring Boot invokes FastAPI with explicit timeouts (connect timeout 2s, read timeout 15s). If the AI service is unavailable, Spring Boot degrades gracefully with fallback messages.

---

## 4. Explainability Contract

All AI engines adhere to the strict 4-tier explainability protocol:
```json
{
  "investigationId": "inv-20260924-001",
  "targetIssue": "DINNER_RATING_DECLINE",
  "observations": [
    "Average dinner rating declined by 31.7% between Oct 10 and Oct 24."
  ],
  "evidence": [
    {
      "metric": "food_frequency_7d",
      "foodName": "Dal Tadka",
      "observedValue": 5,
      "baselineValue": 1.4
    },
    {
      "metric": "complaint_count_theme_oil",
      "observedValue": 42,
      "baselineValue": 3
    }
  ],
  "possibleFactors": [
    {
      "factor": "REPEATED_HIGH_OIL_PREPARATION",
      "description": "High repetition of oily dinner preparations correlated strongly with negative reviews.",
      "confidence": 0.86,
      "supportingEvidenceIndices": [0, 1]
    }
  ],
  "dataWindow": {
    "startDate": "2026-09-01",
    "endDate": "2026-09-24",
    "sampleCount": 1420
  },
  "modelVersion": "rc-engine-v1.0-baseline"
}
```
