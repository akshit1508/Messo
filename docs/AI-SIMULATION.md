# MESO Simulation Engine — Architecture & Specification

**Date:** 2026-09-24  
**Engine:** Simulation Engine (AI Batch 4)  
**Core Purpose:** Answers "WHAT IF WE CHANGE SOMETHING?" via counterfactual scenario modeling and Monte Carlo uncertainty analysis.

---

## 1. Primary Objective & Architectural Flow

The Simulation Engine enables hostel mess managers to test proposed menu changes, recipe substitutions, and repetition spacing adjustments before committing them to the operational schedule.

### Execution Pipeline
```text
Admin Scenario Input
        │
        ▼
Scenario Validation (Checks entity names, meal types, and combination validity)
        │
        ▼
Virtual Scenario State (In-memory representation)
        │
        ▼
Feature Transformation (apply_scenario pure function)
        │
        ▼
Forecast Engine Model (Gradient Boosting / EWMA with empirical error variance)
        │
        ▼
Monte Carlo Simulation (1,000 probabilistic draws from residual distribution)
        │
        ▼
Outcome Distribution (Mean, Std, P10, P25, P50, P75, P90)
        │
        ▼
Baseline vs Scenario Comparative Analysis (Delta, probability of improvement)
        │
        ▼
Advisory Report (Presented to Human Admin for final decision)
```

---

## 2. Hard Safety Rule: Zero Operational Mutation

> **CRITICAL RULE:** Running a simulation must NEVER mutate operational database tables (`daily_menu`, `foods`, `food_reviews`, `complaints`, `polls`, `poll_votes`).

- All feature mutations are pure, in-memory transformations of tabular feature vectors.
- Operational schedules can only be updated when an administrator explicitly invokes the normal Spring Boot admin menu workflow.
- Test suites explicitly verify identical table row counts and content hashes before and after simulation execution.

---

## 3. Supported Scenario Types

### A. Food Replacement (`FOOD_REPLACEMENT`)
- **Use Case:** Substituting one menu item for another on a designated date and meal (e.g. *Rajma* $\to$ *Chole Bhature* or *Paneer Butter Masala* $\to$ *Mix Veg*).
- **Methodology:** Evaluates baseline dish retrospective features vs scenario dish retrospective features at target cutoff $T$.
- **Output:** Comparative predictions, confidence bounds, and difference deltas.

### B. Menu Repetition Adjustment (`REPETITION_CHANGE`)
- **Use Case:** Simulating the impact of increasing the spacing between appearances of a frequent dish (e.g. delaying *Paneer* appearance by +3 days).
- **Methodology:**
  - Evaluates baseline frequency and elapsed days.
  - Pure function `apply_scenario` modifies `days_since_last_served` and `food_frequency_7d` virtually.
  - Sends modified features to `ForecastEngine.predict_ml`.

### C. Multi-Dish Combinations (`MEAL_COMBINATION`)
- **Use Case:** Comparing composite meal offerings (e.g. *Poori + Chana* vs *Poori + Aloo Gobi*).
- **Extension Point:** `ScenarioMeal` schema (`items: List[str]`).
- **Telemetry Reality:** Because individual student reviews grade meals generally rather than dish-pair interaction terms, composite combinations are tagged with **`LOW` confidence** and an explicit assumption:
  > *"Multi-dish combination uses composite dish ensemble. Telemetry does not isolate causal dish-pair interaction terms."*

### D. Poll Preference vs Repetition Separation
- **Repetition Signal:** `food_frequency_7d` and `days_since_last_served`.
- **Preference Signal:** `poll_vote_share_recent`.
- The simulation engine respects this distinction: a shift in student poll popularity is simulated independently of kitchen repetition frequency.

---

## 4. Pure Feature Transformation (`apply_scenario`)

Feature adjustment is executed via an immutable pure function:
```python
def apply_scenario(base_features: Dict[str, float], scenario: Dict[str, Any]) -> Dict[str, float]:
    transformed = base_features.copy()
    if "days_since_last_served" in scenario:
        transformed["days_since_last_served"] = float(scenario["days_since_last_served"])
    if "food_frequency_7d" in scenario:
        transformed["food_frequency_7d"] = float(scenario["food_frequency_7d"])
    if "poll_vote_share_recent" in scenario:
        transformed["poll_vote_share_recent"] = float(scenario["poll_vote_share_recent"])
    return transformed
```

---

## 5. Monte Carlo Uncertainty Methodology

Rather than deterministic point estimates, the Simulation Engine models real-world uncertainty:

1. Let $\hat{y}_{\text{base}}$ and $\hat{y}_{\text{scen}}$ be the ML model predictions.
2. Let $\sigma_{\text{base}}$ and $\sigma_{\text{scen}}$ be the empirical residual error standard deviations ($\sigma \approx 0.38$ for sufficient data, $\sigma \approx 0.65$ for sparse data).
3. Draw $N$ samples (default $N = 1,000$):
   $$Y_{\text{base}}^{(i)} \sim \text{Clip}(\mathcal{N}(\hat{y}_{\text{base}}, \sigma_{\text{base}}^2), 1.0, 5.0)$$
   $$Y_{\text{scen}}^{(i)} \sim \text{Clip}(\mathcal{N}(\hat{y}_{\text{scen}}, \sigma_{\text{scen}}^2), 1.0, 5.0)$$
   $$\Delta^{(i)} = Y_{\text{scen}}^{(i)} - Y_{\text{base}}^{(i)}$$
4. Percentile outputs:
   - **P10:** 10th percentile (pessimistic outcome)
   - **P50:** Median outcome
   - **P90:** 90th percentile (optimistic outcome)
   - **Probability of Improvement:** $\frac{1}{N} \sum \mathbb{I}(\Delta^{(i)} > 0)$
   - **Probability of Rating Drop:** $\frac{1}{N} \sum \mathbb{I}(\Delta^{(i)} < 0)$

---

## 6. API Interface

### `POST /api/v1/simulations`

**Sample Request:**
```json
{
  "simulation_date": "2026-09-25",
  "meal_type": "Dinner",
  "baseline_food": "Rajma",
  "scenario_food": "Chole Bhature",
  "runs": 1000
}
```

**Sample Response:**
```json
{
  "simulation_id": "sim-8f921bc0",
  "simulation_name": "What-If: Rajma vs Chole Bhature",
  "scenario_type": "FOOD_REPLACEMENT",
  "simulation_date": "2026-09-25",
  "meal_type": "Dinner",
  "baseline": {
    "prediction": 3.42,
    "lower_bound": 2.79,
    "upper_bound": 4.05,
    "confidence": "HIGH",
    "p10": 2.93,
    "p50": 3.42,
    "p90": 3.91,
    "std": 0.38
  },
  "scenario": {
    "prediction": 3.86,
    "lower_bound": 3.23,
    "upper_bound": 4.49,
    "confidence": "HIGH",
    "p10": 3.37,
    "p50": 3.86,
    "p90": 4.35,
    "std": 0.38
  },
  "delta": {
    "mean_delta": 0.44,
    "p10_delta": 0.44,
    "p50_delta": 0.44,
    "p90_delta": 0.44,
    "direction": "POSITIVE"
  },
  "distribution": {
    "runs": 1000,
    "mean": 3.86,
    "std": 0.38,
    "p10": 3.37,
    "p25": 3.60,
    "p50": 3.86,
    "p75": 4.12,
    "p90": 4.35,
    "probability_of_improvement": 0.793,
    "probability_of_rating_drop": 0.207
  },
  "confidence": "HIGH",
  "model_version": "sim-engine-v1.0-mc",
  "assumptions": [
    "Simulation is purely advisory; no database records or active schedules were modified.",
    "Monte Carlo execution evaluated 1000 probabilistic draws from model residual error distribution."
  ],
  "key_tradeoffs": [
    "Substituting 'Rajma' with 'Chole Bhature' is projected to improve student satisfaction by +0.44 stars."
  ]
}
```
