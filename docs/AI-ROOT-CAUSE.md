# MESO Root Cause Engine Architecture & Specification

## 1. Executive Summary & Objective

The **MESO Root Cause Engine** (*WHY?*) is an evidence-based diagnostic system designed to analyze shifts in student mess satisfaction, food ratings, and operational feedback. 

**Strict Design Principles:**
1. **Not a Chatbot:** Employs empirical statistical inference, correlation analysis, time-series shifts, and semantic NLP grouping. No LLMs, OpenAI, or external chatbots are utilized for primary reasoning.
2. **Fact vs. Inference Separation:** Outputs are strictly tiered into `OBSERVATION` (raw empirical shifts), `EVIDENCE` (quantitative corroboration), `POSSIBLE_FACTOR` (derived causal hypotheses), and `CONFIDENCE` (calibrated certainty).
3. **Language Protocol:** Hypotheses are articulated as *"Possible contributing factor"*, avoiding definitive causal claims without experimental proof.
4. **Decoupled Signals:** Poll data represents student preference; menu frequency represents repetition. High repetition is never conflated with negative sentiment without corroborating complaints and low poll vote share.

---

## 2. Data Model Verification & Meal-Level Analysis

### 2.1 Audited Relationships
* `daily_menu` $\leftrightarrow$ `foods`: Many-to-one relationship. `daily_menu` has a unique constraint on `menu_date` (`@UniqueConstraint(columnNames = "menuDate")`), permitting one daily featured dish per date.
* `foods.meal_type`: Categorizes dishes as `'Breakfast'`, `'Lunch'`, `'Dinner'`, or `'Snacks'`.
* `food_reviews` $\leftrightarrow$ `foods`: Many-to-one relationship. Each review references a specific `food_id` served on `review_date`.
* `complaint` $\leftrightarrow$ `users`: Contains `type`, `description`, `rating`, and `created_at` timestamp.
* `food_polls` $\leftrightarrow$ `poll_options` $\leftrightarrow$ `poll_votes`: Capture voting choices on food options.

### 2.2 Legitimate Derivation of Meal-Level Analysis
Because `daily_menu` enforces 1 dish per date, meal-level analysis is derived without altering the relational schema through:
1. **Review-to-Food Mapping:** Every review in `food_reviews` joins with `foods`, which explicitly carries `foods.meal_type` (`'Breakfast'`, `'Lunch'`, `'Dinner'`). Rating trends for Breakfast vs. Lunch vs. Dinner are calculated by grouping reviews by `foods.meal_type`.
2. **Complaint Meal Grouping:**
   * **Temporal Binning:** Complaints timestamped between 07:00–11:00 map to Breakfast, 12:00–16:00 to Lunch, and 19:00–23:00 to Dinner.
   * **Semantic Theme Matching:** Descriptions mentioning "dinner", "breakfast", "lunch", "rotis", or "night staff" are tagged with the corresponding meal context.
3. **Menu Frequency by Meal:** Rolling dish frequencies are computed per `meal_type` partition.

---

## 3. Investigation Pipeline

```
Investigation Request (Metric, Target Window, Comparison Window, Optional Filters)
                         ↓
Load Historical Data (Reviews, Menu, Complaints, Polls via Fast SQL/Pandas)
                         ↓
Validate Comparison Windows & Verify Sample Sizes
                         ↓
Calculate Measurable Metric Change & Statistical Significance (t-test, p-value)
                         ↓
If No Significant Change (|Δ| < 0.15, p > 0.05) → Return Stability Observation (No Fabricated Factors)
                         ↓
Analyze Meal-Level Concentration (Breakfast vs Lunch vs Dinner Δ)
                         ↓
Analyze Per-Food Rating Shifts & Frequency (7d, 14d, 30d rolling windows)
                         ↓
Analyze Complaint Semantic Themes (Oiliness, Repetition, Timeliness, Hygiene, Water)
                         ↓
Analyze Poll Preferences (Vote Share & Turnout vs. Historical Baselines)
                         ↓
Detect Temporal Anomaly vs. Chronic Trend (Recovery trajectory check)
                         ↓
Aggregate Corroborating Evidence across Signal Families
                         ↓
Generate Ranked Possible Contributing Factors
                         ↓
Calculate Calibrated Evidence Strength & Confidence (LOW, MEDIUM, HIGH)
                         ↓
Return Structured JSON Response
```

---

## 4. Evidence Families & Mathematical Formulation

### 4.1 Rating Shift Signal
For target period $T$ and comparison baseline period $B$:
$$\Delta \bar{R} = \bar{R}_T - \bar{R}_B$$
$$t = \frac{\bar{R}_T - \bar{R}_B}{\sqrt{\frac{s_T^2}{n_T} + \frac{s_B^2}{n_B}}}$$
A rating drop is statistically significant if $\Delta \bar{R} < -0.20$ and $p < 0.05$.

### 4.2 Repetition Signal (Menu History)
For food item $f$ over window $W \in \{7, 14, 30\}$ days:
$$\text{Frequency}_W(f) = \sum_{d \in W} \mathbb{I}(\text{DailyMenu}_d = f)$$
$$\text{RepetitionScore}_W(f) = \frac{\text{Frequency}_W(f)}{|W|}$$

### 4.3 Preference Signal (Poll Votes)
For poll option $f$ on poll $P$:
$$\text{VoteShare}(f, P) = \frac{\text{Votes}(f, P)}{\sum_{o \in P} \text{Votes}(o, P)}$$

### 4.4 Complaint Theme Velocity
For semantic theme $k$, complaint rate is:
$$\text{Rate}(k) = \frac{\text{Count}(k)}{\text{Total Days in Period}}$$
$$\text{Velocity}(k) = \frac{\text{Rate}_T(k) + 0.01}{\text{Rate}_B(k) + 0.01}$$
A theme spike is detected when $\text{Velocity}(k) \ge 2.0$.

---

## 5. Confidence Calculation Methodology

Confidence is never hardcoded. It is computed as a weighted score $S_{\text{conf}} \in [0, 1]$ based on 4 criteria:

1. **Signal Breadth ($w_1 = 0.35$):** Number of independent supporting signal families (Rating, Food Frequency, Complaint NLP, Poll Preference).
2. **Statistical Significance ($w_2 = 0.25$):** $p$-value of metric change ($p < 0.01 \implies 1.0$, $p < 0.05 \implies 0.7$, else $0.3$).
3. **Effect Magnitude ($w_3 = 0.25$):** Magnitude of complaint velocity or rating drop ($> 3\times$ spike or $> 1.0$ star drop $\implies 1.0$).
4. **Consistency / Lack of Contradiction ($w_4 = 0.15$):** Penalty if counter-signals exist (e.g. repetition high but poll preference also high).

**Calibration Tiers:**
* $S_{\text{conf}} \ge 0.75 \implies \mathbf{HIGH}$
* $0.50 \le S_{\text{conf}} < 0.75 \implies \mathbf{MEDIUM}$
* $S_{\text{conf}} < 0.50 \implies \mathbf{LOW}$

---

## 6. Scenario Handling & Validation

### Scenario A: Oiliness Pattern
* **Signals:** Dal Tadka/Fry dinner frequency increases $\to$ Dal rating drops from 4.1 to 2.3 $\to$ Oil complaint theme velocity $> 4.0\times$.
* **Output:** `POSSIBLE_FACTOR`: `HIGH_OIL_PREPARATION`, `CONFIDENCE`: `HIGH`. Traceable evidence items linked to oil complaints and Dal ratings.

### Scenario B: Repetition vs. Preference Decoupling
* **Window 1 (Fatigue):** High Paneer frequency $\to$ Repetition complaints surge $\to$ Paneer poll preference drops to 5.2%.
  * **Output:** `POSSIBLE_FACTOR`: `MENU_REPETITION_FATIGUE`, `CONFIDENCE`: `HIGH`.
* **Window 2 (Counterexample):** High Paneer frequency during celebration month $\to$ Repetition complaints are negligible $\to$ Paneer poll preference remains dominant at 17.8%.
  * **Output:** No `MENU_REPETITION_FATIGUE` factor is generated. Engine avoids false positive.

### Scenario C: Meal-Specific Problem
* **Signals:** Breakfast and lunch ratings remain stable ($\Delta < 0.1$). Dinner ratings drop by $> 1.2$ stars with dinner timeliness complaints.
* **Output:** `POSSIBLE_FACTOR`: `DINNER_SERVICE_CONCENTRATION`.

### Scenario D: Temporary Anomaly vs. Chronic Trend
* **Signals:** 7-day sharp rating decline and hygiene spike due to water pipe maintenance $\to$ Subsequent week ratings rebound immediately to 4.2 baseline.
* **Output:** `POSSIBLE_FACTOR`: `TEMPORARY_OPERATIONAL_ANOMALY`. Engine notes transient nature rather than systemic menu defect.

### No Meaningful Change
* **Signals:** Current vs baseline rating shift $< 0.15$, $p > 0.05$.
* **Output:** Observations confirm stability. No contributing factors fabricated.
