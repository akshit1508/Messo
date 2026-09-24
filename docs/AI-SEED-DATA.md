# MESO Deterministic Indian Seed Data System

## 1. Overview & Principles

The MESO Demo Dataset is a deterministic, synthetic Indian mess management dataset covering **12 continuous months (~365 days)** of operational history. It is generated using a fixed random seed (`seed = 42`) to guarantee identical, reproducible statistical evaluations for AI modeling.

### Key Tenets
1. **100% Synthetic:** No actual personal data or live phone numbers are used.
2. **Indian Mess Context:** Realistic student names, hostel blocks, and authentic mess dishes (Poha, Upma, Dal Tadka, Paneer Butter Masala, Chole Bhature, Gulab Jamun, etc.).
3. **Relationship-Safe:** Strictly complies with all database foreign keys and unique constraints (`(user_id, review_date)`, `@UniqueConstraint(columnNames = "menuDate")`).
4. **Separation of Signals:** Poll preferences and menu repetition frequencies are strictly independent features.

---

## 2. Seed Data Volumes

| Table / Entity | Target Range | Actual Seeded Count | Integrity Status |
| :--- | :--- | :--- | :--- |
| **Students (`users`)** | 200–300 | **250** (306 total in DB) | ✅ 100% Valid, BCrypt encoded |
| **Student Profiles** | 200–300 | **250** (301 total in DB) | ✅ 0 Broken FKs |
| **Food Catalog (`foods`)** | 30–50 | **39** | ✅ 0 Duplicates |
| **Daily Menu (`daily_menu`)**| ~365 (1 per date) | **365** (366 total) | ✅ Unique date constraint preserved |
| **Ratings (`food_reviews`)** | 30,000–50,000 | **34,901** | ✅ Ratings 1-5, no user/date duplicates |
| **Complaints (`complaint`)** | 2,000–3,000 | **2,186** | ✅ Valid enum types, 15-200 chars |
| **Polls (`food_polls`)** | 300–500 | **365** (369 total) | ✅ 1 Active poll, 364 Historical |
| **Poll Options (`poll_options`)** | 1,200–2,000 | **1,460** (1,553 total) | ✅ 4 options per poll |
| **Poll Votes (`poll_votes`)** | 15,000–25,000 | **20,683** (20,911 total) | ✅ 1 vote per student per poll |
| **Announcements (`announcements`)** | 100+ | **125** | ✅ Realistic hostel notices |
| **Notifications (`notification`)** | 500+ | **623** | ✅ Resolved complaint notices |

---

## 3. The Three Data Layers

### Layer 1: Base Data
* Represents standard, routine hostel life across 365 days.
* Average ratings fluctuate naturally between 3.8 and 4.3 stars.
* Baseline complaint rate of 3–6 complaints per day across diverse categories (`FOOD_QUALITY`, `HYGIENE`, `TIMELINESS`, `FACILITY`, `STAFF_BEHAVIOR`, `OTHER`).
* Weekend turnout decreases realistically by ~15%.

### Layer 2: Pattern Data (Four Intentional Historical Scenarios)

#### Scenario A: Oiliness / Greasiness Pattern
* **Window:** Days 240 to 270 (May–June).
* **Pattern:** Dinner frequency of `Dal Tadka` and `Dal Fry` spikes to 4–5 times per week.
* **Metric Shift:** Ratings on Dal items drop from baseline 4.1 to **2.3** average.
* **Complaints:** 155 specific complaints filed mentioning "oily", "greasy", "floating oil" (e.g. *"The dal was very oily today."*, *"Too much oil in dal and curry."*).
* **Design Note:** No artificial `rootCause = OIL` column exists; the Root Cause Engine must uncover this link empirically.

#### Scenario B: Menu Repetition vs. Poll Preference Decoupling
* **Window 1 (Fatigue Window, Days 120–150):**
  * `Paneer Butter Masala` served every alternate day (high repetition).
  * Repetition complaints spike ("Paneer is coming too often", "Menu feels repetitive").
  * Student poll preference for Paneer plummets to **5.2%**, as students overwhelmingly vote for alternatives like `Jeera Rice` (13.9%), `Mix Veg` (13.7%), and `Chole Bhature` (13.3%).
* **Window 2 (Celebration Window, Days 310–330):**
  * High Paneer repetition during festival/exam celebration month.
  * **Counterexample:** Poll preference for Paneer remains dominant at **17.8%** (top-voted dish along with `Kadai Paneer` at 17.9%). Repetition complaints remain near zero.
* **Conclusion:** Proves repetition is not inherently negative. Poll measures current preference; menu history measures frequency.

#### Scenario C: Meal-Specific Anomaly (Dinner Shift)
* **Window:** Days 60 to 90 (November–December).
* **Pattern:** Breakfast items (`Poha`, `Aloo Paratha`) remain steady at 4.2 stars. Lunch items remain steady at 4.0 stars. Dinner ratings suffer a localized drop to **2.6** stars due to evening staffing delays and cold rotis.

#### Scenario D: Temporary Anomaly vs. Trend
* **Window:** Days 180 to 187 (Late March, 7-day period).
* **Pattern:** Sharp 1-week drop in ratings to **2.2** and 4x surge in hygiene complaints caused by a temporary kitchen water pipe disruption.
* **Recovery:** By Day 188, ratings snap back to **4.2** baseline as repairs complete. Allows AI engines to distinguish transient anomalies from systemic issues.

### Layer 3: Noise Data
* Stochastic variance applied across all days:
  * 5–10% of ratings on great food days are randomly 1 or 2 stars.
  * 5–10% of ratings on problem days are randomly 4 or 5 stars.
  * Weekend voter participation shifts.

---

## 4. How to Execute / Reset / Reseed

The generator script is located at `scripts/seed_demo_data.py`.

### Safe Reseed Command (Fresh Reset & Seed)
```bash
python scripts/seed_demo_data.py --fresh
```

### Dry Run / Custom Output File
```bash
python scripts/seed_demo_data.py --output-sql custom_seed.sql
```

### Safety Flags
* The script enforces `--confirm-demo=True` by default. In production environments, running without this flag terminates immediately with an error code.
* The script only wipes demo records matching `%.demo@messo.com`, leaving primary administrators (`admin@messo.com`) and test students intact.

---

## 5. Post-Seed Verification Queries

All relational constraints and integrity checks pass with zero violations:
```sql
-- 0 broken foreign keys
SELECT count(*) FROM student_profiles sp LEFT JOIN users u ON sp.user_id = u.id WHERE u.id IS NULL; -- 0
SELECT count(*) FROM food_reviews fr LEFT JOIN foods f ON fr.food_id = f.id WHERE f.id IS NULL; -- 0
SELECT count(*) FROM complaint c LEFT JOIN users u ON c.user_id = u.id WHERE u.id IS NULL; -- 0
SELECT count(*) FROM poll_votes pv LEFT JOIN poll_options po ON pv.option_id = po.id WHERE po.id IS NULL; -- 0

-- 0 invalid ratings
SELECT count(*) FROM food_reviews WHERE rating < 1 OR rating > 5; -- 0
```
