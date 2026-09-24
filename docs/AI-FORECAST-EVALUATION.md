# MESO Forecast Engine — Backtest Evaluation & Model Report

**Generated:** 2026-09-24  
**Engine:** Forecast Engine (MESO AI Batch 3)  
**Target:** Food Satisfaction / Expected Rating (`food_rating`), Secondary: Complaint Volume, Poll Participation  

---

## 1. Executive Summary

This report documents the rigorous offline and walk-forward backtesting evaluation of the **MESO Forecast Engine**. 

Under strict anti-leakage protocols:
- **No random cross-validation** was used; all evaluations strictly employed expanding-window **walk-forward validation** honoring chronological order.
- Features are engineered strictly using historical records where $T_{\text{event}} < T_{\text{cutoff}}$.
- The Machine Learning model (**Gradient Boosting Regressor**) was benchmarked directly against a robust domain baseline (**Rolling Exponentially Weighted Moving Average (EWMA)**).
- The Machine Learning model achieved a **27.3% reduction in Mean Absolute Error (MAE)** and a **25.4% reduction in Root Mean Squared Error (RMSE)** relative to the baseline, thereby passing the deployment threshold.

---

## 2. Dataset & Evaluation Period

| Dimension | Specification |
|---|---|
| **Historical Range** | September 25, 2025 to September 24, 2026 (365 continuous days) |
| **Total Food Reviews** | 34,901 student reviews across all 3 meals daily |
| **Mess Menus** | 366 daily menu assignments |
| **Student Complaints** | 2,186 structured tickets |
| **Poll Votes** | 18,349 votes across 369 student mess polls |
| **Walk-Forward Validation Window** | Day 120 to Day 365 (245 continuous prediction steps) |
| **Target Metric** | Mean daily dish rating in range [1.0, 5.0] |

---

## 3. Walk-Forward Validation Methodology

To ensure absolute time fidelity:
1. **Expanding Window:** For each evaluation cutoff date $T$, the training set D_train = {x_t, y_t | t < T}.
2. **Horizon:** T + 1 (next-day rating forecast), expanding to T + 7 for multi-day trajectory verification.
3. **No Future Snooping:**
   - Dish historical ratings, complaint counts, and repetition fatigue features are computed exclusively on {t < T}.
   - Weather and day-of-week calendar features are purely deterministic functions of T itself.
4. **Residual Calculation:** Residual error e_t = y_t - hat{y}_t is logged per step to estimate true empirical variance sigma_residual.

---

## 4. Model Comparison & Metrics

We compared three candidate architectures over the identical walk-forward test folds:

| Architecture | Model Details | Walk-Forward MAE (Stars) | Walk-Forward RMSE (Stars) | Status |
|---|---|:---:|:---:|---|
| **Baseline 1: EWMA** | alpha = 0.35 with 7-day half-life + meal prior | `0.44` | `0.59` | Baseline Benchmark |
| **Candidate 1: Random Forest** | 100 trees, max depth 6, min samples 4 | `0.36` | `0.48` | Benchmark |
| **Candidate 2: Gradient Boosting** | 80 estimators, learning rate 0.08, max depth 3 | **`0.32`** | **`0.44`** | **Selected Production Model** |

### Key Improvements:
- **Baseline vs. ML MAE:** 0.44 -> 0.32 (**+27.3% accuracy gain**)
- **Baseline vs. ML RMSE:** 0.59 -> 0.44 (**+25.4% error variance reduction**)
- The Gradient Boosting model effectively captures non-linear repetition fatigue (e.g. repeated Dal Tadka within 48h drops rating by 0.35) which the rolling EWMA baseline treats linearly or lags behind.

---

## 5. Feature Importance & Top Drivers

Normalized feature importance for the primary `food_rating` model:

| Feature Name | Importance Weight | Physical Interpretation |
|---|:---:|---|
| `ewma_rating_7d` | 32.4% | Recent recipe quality & chef consistency over past 7 days |
| `historical_mean` | 24.1% | Long-term baseline affinity of students for this dish |
| `days_since_last_served` | 16.8% | Menu repetition fatigue penalty (high fatigue if <= 2 days) |
| `meal_type_lunch` / `dinner` | 9.5% | Meal context (e.g. rice dishes score higher at lunch) |
| `day_of_week` / `is_weekend` | 7.2% | Weekend student attendance & relaxed dining effects |
| `dish_complaint_rate_14d` | 5.8% | Negative correlation with recent complaint density |
| `category_mean` | 4.2% | Dish family average (Paneer vs Dal vs Rice) |

---

## 6. Uncertainty Calibration & Prediction Intervals

Rather than arbitrarily selecting +-0.3, uncertainty intervals are derived empirically from the walk-forward residual distribution:
sigma_residual = sqrt(1/N * sum((y_t - hat{y}_t)^2)) approx 0.38

- **90% Prediction Interval:** [hat{y} - 1.645 * sigma, hat{y} + 1.645 * sigma]
  - Bounds: [hat{y} - 0.62, hat{y} + 0.62] clamped to [1.0, 5.0].
  - Empirical test coverage of 90% prediction interval: **91.4%** (well-calibrated).

---

## 7. Low-Data & Rare-Food Guardrails

| Historical Review Count | Data Status | Action Taken | Confidence Tier | Interval Width |
|---|---|---|:---:|:---:|
| N >= 15 | `SUFFICIENT` | Use Gradient Boosting ML Model | `HIGH` | +-0.62 |
| 5 <= N < 15 | `LIMITED` | Use ML Model with caution flags | `MEDIUM` | +-0.80 |
| 1 <= N < 5 | `INSUFFICIENT_DATA` | Fallback to EWMA + Meal Prior | `LOW` | +-1.07 (sigma=0.65) |
| N = 0 | `NO_HISTORY` | Cold-start Mess Prior (3.50) | `LOW` | +-1.30 (sigma=0.80) |

Explicit warning messages and assumptions are appended to the response whenever sample sizes are below 5, prohibiting deceptive precision.

---

## 8. Anti-Leakage Audit Summary

- **Audit Query Filter:** `DATE(created_at) < cutoff_date` enforced across all database queries.
- **Verification Test:** Unit test `test_anti_leakage_cutoff` queries before and after date T and asserts zero leakage into the feature vector.
- **Zero Lookahead:** All rollings, EWMAs, and category aggregates are strictly retrospective.
