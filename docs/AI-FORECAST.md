# MESO Forecast Engine Specification & Data Audit

## 1. Executive Summary & Objective

The **MESO Forecast Engine** (*WHAT NEXT?*) provides probabilistic, time-aware forward-looking predictions for hostel mess operations.

**Core Mission:**
Empower mess administrators and menu committees to anticipate student satisfaction, complaint surges, and turnout **before** finalizing or publishing upcoming menus.

**Core Tenets:**
1. **Probabilistic Output:** Forecasts output an expected midpoint, an empirical lower bound, an empirical upper bound, and an explicit confidence level (`LOW`, `MEDIUM`, `HIGH`). It never asserts deterministic certainty.
2. **Zero Future Leakage:** Strictly chronological train/validation/test splitting and walk-forward evaluations. No observation from $t \ge T_{\text{forecast}}$ may ever enter the feature set.
3. **Best Model Selection:** If a baseline rolling average outperforms or matches a complex machine learning model during walk-forward validation, the engine selects and explains the baseline.
4. **Honest Low-Data Handling:** For newly introduced or infrequently served dishes ($N < 5$ historical reviews), the engine explicitly reports low confidence / insufficient data rather than fabricating artificial precision.

---

## 2. Historical Data Audit

### 2.1 Relational Sources & Coverage
* **`food_reviews`**: 34,901 records spanning 365 continuous days (`2025-09-25` to `2026-09-24`). Daily volume: 80–110 reviews/day. 16 distinct main dishes actively reviewed.
* **`daily_menu`**: 366 records (365 historical + tomorrow's scheduled menu). Exactly 1 featured dish per date (`@UniqueConstraint(columnNames = "menuDate")`).
* **`foods`**: 39 authentic Indian hostel foods categorized by `meal_type` (`Breakfast`, `Lunch`, `Dinner`, `Snacks`). Includes high-frequency dishes (e.g. Paneer Butter Masala, 50 days) and unserved/catalog dishes (0 days), providing real test data for rare-item handling.
* **`complaint`**: 2,186 records across all 365 days. Mean daily complaints: 5.98/day.
* **`food_polls` & `poll_votes`**: 369 polls, 20,911 cast votes across 365 days.

### 2.2 Missing Data & Low-Sample Partitioning
| Category | Historical Count | Forecast Treatment |
| :--- | :--- | :--- |
| **High-Data Dish** | $\ge 20$ served dates ($N > 1,500$ reviews) | Full ML / Gradient Boosting feature extraction |
| **Moderate-Data Dish**| $5–19$ served dates ($400 \le N < 1,500$) | Hybrid rolling mean + meal category prior |
| **Low-Data / Rare Dish**| $< 5$ served dates ($N < 400$) | Explicit `LOW` confidence tier, wide prediction interval, warning flag |
| **Zero Historical Reviews**| 0 dates | Category meal-type prior with explicit warning: `"Insufficient historical observations"` |

---

## 3. Anti-Leakage Protocol (Time-Aware Feature Engineering)

All features for a forecast at target date $T$ are computed strictly using information available at $T_{\text{cutoff}} = T - 1\text{ day}$ (23:59:59):

```
Historical Data Window (< T_forecast)       |  Forecast Horizon (>= T_forecast)
[==========================================]|  [ Day T ] [ Day T+1 ] ... [ Day T+7 ]
                                            |
                      ↑ Cutoff Point        |
               (Strict Feature Boundary)    |
```

### Feature Matrix Formulation:
1. **Recent Food Performance:**
   * `food_rating_last_served`: Rating of the dish on its most recent appearance.
   * `food_rating_7d_mean`, `food_rating_30d_mean`, `food_rating_all_time_mean`.
   * `food_rating_30d_std`: Historical volatility of student sentiment for this dish.
2. **Repetition & Scheduling Dynamics:**
   * `food_frequency_7d`, `food_frequency_14d`, `food_frequency_30d`.
   * `days_since_last_served`: Measures student appetite recovery or menu freshness.
3. **Kitchen Operational Context:**
   * `overall_rating_7d_mean`: General sentiment across the entire mess in the past week.
   * `complaint_count_7d`: Total complaints filed in the preceding 7 days.
   * `complaint_rate_oil_7d`: Frequency of oil/greasiness complaints in the past 7 days.
4. **Student Preference Context:**
   * `poll_vote_share_recent`: Most recent poll vote share for this dish.
5. **Calendar & Seasonality Signals:**
   * `day_of_week` ($0 = \text{Monday}, 6 = \text{Sunday}$).
   * `is_weekend` ($0 \text{ or } 1$).
   * `meal_type_code` (Categorical encoding of Breakfast, Lunch, Dinner).
   * `month` ($1–12$).

---

## 4. Modeling Strategy & Evaluation

### 4.1 Chronological Walk-Forward Backtesting
No random $K$-fold cross-validation. Backtesting uses chronological rolling origins:
* **Train:** Months 1–6 (`2025-09-25` to `2026-03-24`)
* **Validate:** Month 7 (`2026-03-25` to `2026-04-24`)
* **Test:** Months 8–12 (`2026-04-25` to `2026-09-24`)

### 4.2 Candidate Models
1. **Baseline Model:** Exponentially Weighted Moving Average (EWMA) of recent dish ratings ($w_1 = 0.5$ last served, $w_2 = 0.3$ 30d mean, $w_3 = 0.2$ all-time mean).
2. **Gradient Boosting Regressor (`scikit-learn`):** Non-linear decision trees capturing interactions between repetition, complaints, and day of week.
3. **Random Forest Regressor (`scikit-learn`):** Ensemble bagging model robust against outliers.

### 4.3 Evaluation Metrics
$$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |y_i - \hat{y}_i|$$
$$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (y_i - \hat{y}_i)^2}$$

---

## 5. Prediction Interval & Confidence Derivation

### 5.1 Empirical Prediction Interval
Rather than an arbitrary $\pm 0.3$, the prediction interval is derived from validation residual distribution:
$$\text{Lower Bound} = \max\left(1.0, \hat{y} - z \cdot \sigma_{\text{residual}}\right)$$
$$\text{Upper Bound} = \min\left(5.0, \hat{y} + z \cdot \sigma_{\text{residual}}\right)$$
Where $z = 1.645$ (90% prediction interval) and $\sigma_{\text{residual}}$ is the standard deviation of walk-forward errors.

### 5.2 Calibrated Confidence Tiers
* **HIGH:** Dish has $\ge 15$ past appearances, was served within the last 21 days, and walk-forward $\text{MAE} \le 0.35$.
* **MEDIUM:** Dish has $5–14$ appearances, served within 45 days, and $\text{MAE} \le 0.55$.
* **LOW:** Dish has $< 5$ appearances, was not served recently, or residual variance is high.
