# MESO AI Data Map & Schema Audit

## 1. Executive Summary
This document provides a comprehensive audit of the MESO relational schema (MySQL + Spring Data JPA Hibernate entities), mapping every entity, constraint, relationship, and field to its downstream role in the MESO AI Intelligence Foundation (Root Cause Engine, Forecast Engine, Simulation Engine).

---

## 2. Entity Audits & Field Mappings

### 2.1 User
* **Entity Class:** `com.messo.model.User`
* **Table Name:** `users`
* **Primary Key:** `id` (`Long`, `GenerationType.IDENTITY`)
* **Important Fields:**
  * `email` (`varchar(255)`, UNIQUE, NOT NULL): Student or Admin login identifier.
  * `password` (`varchar(255)`, NOT NULL): BCrypt encrypted hash.
  * `role` (`varchar(255)`, NOT NULL): Security role (`ROLE_STUDENT`, `ROLE_ADMIN`).
  * `enabled` (`bit(1)` / `boolean`, NOT NULL, default `true`): Account active flag.
* **Relationships:**
  * OneToOne with `StudentProfile` (mapped by `user` in `student_profiles`).
  * OneToMany with `FoodReview` (`user_id`).
  * OneToMany with `PollVote` (`user_id`).
  * OneToMany with `Complaint` (`user_id`).
  * OneToMany with `AnnouncementRead` (`user_id`).
  * OneToMany with `StudentNotification` (`student_id`).
  * OneToMany with `Notification` (`user_id`).
* **Historical Date Field:** None directly on `users`.
* **AI Usage:**
  * Segmenting user engagement, participation rates, and sentiment polarization.
  * Cohort identification (e.g. frequent voters vs. occasional raters).
* **Data Quality Concerns:** Demo accounts must be distinguished from administrative users (`role = 'ROLE_ADMIN'`).

---

### 2.2 StudentProfile
* **Entity Class:** `com.messo.model.StudentProfile`
* **Table Name:** `student_profiles`
* **Primary Key:** `id` (`Long`, `GenerationType.IDENTITY`)
* **Important Fields:**
  * `name` (`varchar(255)`): Student's full display name.
  * `studentId` (`varchar(255)`, UNIQUE, NOT NULL): College enrollment / roll number.
  * `hostel` (`varchar(255)`): Hostel block and room identifier (e.g. `Block B, 305`).
  * `phoneNumber` (`varchar(255)`): Contact number.
  * `user_id` (FK to `users.id`, UNIQUE): 1-to-1 link to user credentials.
* **Relationships:** ManyToOne/OneToOne to `User`.
* **Historical Date Field:** None.
* **AI Usage:**
  * Geographical / Hostel-block clustering (e.g. Block A vs Block B complaint distributions).
  * Demographic stratification for mess feedback.
* **Data Quality Concerns:** Must not use real personal data. Must respect unique `studentId` constraint.

---

### 2.3 Food
* **Entity Class:** `com.messo.model.Food`
* **Table Name:** `foods`
* **Primary Key:** `id` (`Long`, `GenerationType.IDENTITY`)
* **Important Fields:**
  * `name` (`varchar(255)`): Standardized food name (e.g. `Paneer Butter Masala`, `Dal Tadka`, `Poha`).
  * `mealType` (`varchar(255)`): Associated meal type (`Breakfast`, `Lunch`, `Dinner`, `Snacks`).
* **Relationships:**
  * OneToMany with `DailyMenu` (`food_id`).
  * OneToMany with `FoodReview` (`food_id`).
* **Historical Date Field:** None.
* **AI Usage:**
  * Primary entity for menu catalog, rating tracking, and poll item linking.
  * Category features (e.g. curry, bread, rice, sweet, breakfast dish).
* **Data Quality Concerns:** Inconsistent casing (handled via `findByNameIgnoreCase` in repository).

---

### 2.4 DailyMenu
* **Entity Class:** `com.messo.model.DailyMenu`
* **Table Name:** `daily_menu`
* **Primary Key:** `id` (`Long`, `GenerationType.IDENTITY`)
* **Important Fields:**
  * `menuDate` (`date`, NOT NULL, UNIQUE): Calendar date the menu is scheduled/served.
  * `food_id` (`bigint`, NOT NULL, FK to `foods.id`): Food item served.
* **Constraints:**
  * `@UniqueConstraint(columnNames = "menuDate")` -> Strict 1 record per calendar date.
* **Relationships:** ManyToOne to `Food`.
* **Historical Date Field:** `menuDate` (`LocalDate`).
* **AI Usage:**
  * **REPETITION SIGNAL**: Primary source for computing food repetition over 7-day, 14-day, and 30-day rolling windows.
  * Meal frequency, day-of-week patterns, interval between re-appearances.
* **Data Quality Concerns:** Enforces exactly one daily featured food per calendar date. Cannot store multiple meals per date without schema modification; thus repetition analysis operates across the sequence of daily featured dishes.

---

### 2.5 FoodReview
* **Entity Class:** `com.messo.model.FoodReview`
* **Table Name:** `food_reviews`
* **Primary Key:** `id` (`Long`, `GenerationType.IDENTITY`)
* **Important Fields:**
  * `rating` (`int`, NOT NULL): Integer score from 1 to 5 stars.
  * `reviewDate` (`date`, nullable in DB, populated by app): Date on which rating was given.
  * `food_id` (`bigint`, FK to `foods.id`).
  * `user_id` (`bigint`, FK to `users.id`).
* **Constraints:**
  * `@UniqueConstraint(columnNames = {"user_id", "reviewDate"})` -> A student can submit at most 1 review per calendar day.
* **Relationships:** ManyToOne to `Food`, ManyToOne to `User`.
* **Historical Date Field:** `reviewDate` (`LocalDate`).
* **AI Usage:**
  * Quality signal: average rating, rolling 7d/14d/30d moving average, rating volatility, rating decline trends.
  * Correlation with food repetition, complaints, and day of week.
* **Data Quality Concerns:** Ratings are integers 1 to 5. Unique constraint prevents duplicate reviews per user per date.

---

### 2.6 FoodPoll
* **Entity Class:** `com.messo.model.FoodPoll`
* **Table Name:** `food_polls`
* **Primary Key:** `id` (`Long`, `GenerationType.IDENTITY`)
* **Important Fields:**
  * `pollDate` (`date`): Scheduled date for poll outcome / vote target.
  * `active` (`bit(1)` / `boolean`): Only one active poll allowed at any given time by business rule.
* **Relationships:** OneToMany with `PollOption` (cascade = ALL, orphanRemoval = true, EAGER).
* **Historical Date Field:** `pollDate` (`LocalDate`).
* **AI Usage:**
  * **PREFERENCE SIGNAL**: Tracks student demand and choice among alternatives.
  * Separated strictly from menu repetition: High repetition does not mean low poll preference, and vice versa.
* **Data Quality Concerns:** Only one poll is active at a time; past historical polls must have `active = false`.

---

### 2.7 PollOption
* **Entity Class:** `com.messo.model.PollOption`
* **Table Name:** `poll_options`
* **Primary Key:** `id` (`Long`, `GenerationType.IDENTITY`)
* **Important Fields:**
  * `foodName` (`varchar(255)`): Display name of food option.
  * `poll_id` (`bigint`, NOT NULL, FK to `food_polls.id`).
* **Relationships:** ManyToOne to `FoodPoll`, OneToMany with `PollVote` (`option_id`).
* **Historical Date Field:** Inherited from parent `FoodPoll.pollDate`.
* **AI Usage:** Item-level preference capture across competing choices.

---

### 2.8 PollVote
* **Entity Class:** `com.messo.model.PollVote`
* **Table Name:** `poll_votes`
* **Primary Key:** `id` (`Long`, `GenerationType.IDENTITY`)
* **Important Fields:**
  * `user_id` (`bigint`, NOT NULL, FK to `users.id`).
  * `option_id` (`bigint`, NOT NULL, FK to `poll_options.id`).
* **Business Rules:** One vote per student per poll (`existsByUserIdAndOptionPollId`).
* **Relationships:** ManyToOne to `User`, ManyToOne to `PollOption`.
* **AI Usage:**
  * Vote share calculation (`votes_for_option / total_votes_in_poll`).
  * Participation volume and voter turnout trends.
* **Data Quality Concerns:** Single vote rule per student per poll must not be violated.

---

### 2.9 Complaint
* **Entity Class:** `com.messo.model.Complaint`
* **Table Name:** `complaint` (Singular table name in JPA)
* **Primary Key:** `id` (`Long`, `GenerationType.IDENTITY`)
* **Important Fields:**
  * `type` (`varchar(255)`): Category enum string (`FOOD_QUALITY`, `HYGIENE`, `TIMELINESS`, `FACILITY`, `STAFF_BEHAVIOR`, `OTHER`).
  * `description` (`varchar(1000)`): Detailed text of the issue (5–1000 characters).
  * `rating` (`int` / `Integer`, nullable): Associated rating (1-5) if provided.
  * `resolved` (`bit(1)`, NOT NULL, default `false`): Resolution status.
  * `created_at` (`datetime(6)`): Timestamp when complaint was submitted.
  * `user_id` (`bigint`, FK to `users.id`).
* **Relationships:** ManyToOne to `User`.
* **Historical Date Field:** `createdAt` (`LocalDateTime`).
* **AI Usage:**
  * Semantic theme extraction and NLP issue clustering (e.g. oily, stale, salty, cold, insect, delay).
  * Complaint volume spikes, resolution turnaround latency.
  * Alignment with rating drops for Root Cause Engine.
* **Data Quality Concerns:** Descriptions must meet length validation (min 5, max 1000). Category strings must match valid types.

---

### 2.10 Announcements & Notifications
* **Entities:**
  * `Announcement` (`announcements`): `title`, `message` (1000), `createdAt`.
  * `AnnouncementRead` (`announcement_reads`): `announcement_id`, `user_id`, `readAt`.
  * `StudentNotification` (`student_notifications`): `student_id`, `announcement_id`, `isRead`, `createdAt`.
  * `Notification` (`notification`): `user_id`, `message`, `is_read`, `created_at`.
* **AI Usage:**
  * Event tracking (e.g. mess timing change, vendor change, festival feast, kitchen maintenance).
  * Explaining sudden anomalies (e.g. kitchen renovation explains a 3-day drop in timeliness ratings).

---

## 3. Strict Boundary Rules: Preference vs. Repetition

| Concept | Source Entity | Primary Metric | AI Engine Role |
| :--- | :--- | :--- | :--- |
| **Repetition Signal** | `DailyMenu` (`daily_menu`) | `food_frequency_7d`, `food_frequency_14d`, `food_frequency_30d`, `repetition_score` | Measure fatigue and menu staleness |
| **Preference Signal** | `FoodPoll`, `PollOption`, `PollVote` | `vote_share`, `vote_count`, `turnout_pct` | Measure student desire and choice |

**Critical Directive:** Never conflate poll results with repetition. A dish can have high repetition and low preference (e.g., student fatigue), or high repetition and high preference (e.g., beloved Sunday special). The AI models must treat these as independent features.
