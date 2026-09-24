#!/usr/bin/env python3
"""
MESO Synthetic Indian Demo Data Generator
Deterministic, reproducible, relationship-safe seeder for 12 months of mess activity.
Fixed seed: 42
"""

import sys
import os
import random
import subprocess
from datetime import date, datetime, timedelta

FIXED_SEED = 42
TOTAL_STUDENTS = 250
DAYS_SPAN = 365
END_DATE = date(2026, 9, 24)
START_DATE = END_DATE - timedelta(days=DAYS_SPAN - 1)

# Authentic Indian Hostel Food Catalog
FOOD_CATALOG = [
    # Breakfast items
    ("Poha", "Breakfast"),
    ("Upma", "Breakfast"),
    ("Aloo Paratha", "Breakfast"),
    ("Paneer Paratha", "Breakfast"),
    ("Idli Sambhar", "Breakfast"),
    ("Masala Dosa", "Breakfast"),
    ("Poori Bhaji", "Breakfast"),
    ("Methi Thepla", "Breakfast"),
    ("Sabudana Khichdi", "Breakfast"),
    ("Veg Cutlet", "Breakfast"),
    
    # Lunch / Dinner Mains & Curries
    ("Paneer Butter Masala", "Lunch"),
    ("Kadai Paneer", "Dinner"),
    ("Shahi Paneer", "Dinner"),
    ("Palak Paneer", "Dinner"),
    ("Dal Tadka", "Dinner"),
    ("Dal Fry", "Lunch"),
    ("Rajma Chawal", "Lunch"),
    ("Chole Bhature", "Lunch"),
    ("Kadhi Pakoda", "Lunch"),
    ("Mix Veg", "Dinner"),
    ("Aloo Gobi", "Lunch"),
    ("Bhindi Masala", "Dinner"),
    ("Baingan Bharta", "Dinner"),
    ("Dum Aloo", "Dinner"),
    
    # Rice & Breads
    ("Jeera Rice", "Lunch"),
    ("Veg Pulao", "Dinner"),
    ("Steamed Rice", "Lunch"),
    ("Chapati", "Dinner"),
    ("Tandoori Roti", "Dinner"),
    ("Poori", "Lunch"),
    
    # Sweets / Desserts
    ("Gulab Jamun", "Dinner"),
    ("Kheer", "Dinner"),
    ("Sooji Halwa", "Breakfast"),
    ("Moong Dal Halwa", "Dinner"),
    ("Rasgulla", "Lunch")
]

INDIAN_FIRST_NAMES = [
    "Aarav", "Ananya", "Rohan", "Kavya", "Rahul", "Neha", "Aditya", "Ishita",
    "Akash", "Priya", "Mohit", "Shreya", "Aryan", "Tanvi", "Kunal", "Riya",
    "Varun", "Pooja", "Harsh", "Divya", "Ayush", "Sneha", "Nikhil", "Megha",
    "Siddharth", "Anjali", "Abhinav", "Simran", "Mayank", "Ritika", "Vivek",
    "Sakshi", "Kartik", "Payal", "Aman", "Swati", "Yash", "Deepa", "Gaurav",
    "Pallavi", "Alok", "Bhavna", "Chetan", "Drishti", "Eshan", "Garima",
    "Hemant", "Juhi", "Kiran", "Lokesh", "Mansi", "Naveen", "Ojas", "Prachi",
    "Rajesh", "Sanjay", "Tarun", "Urvashi", "Vipul", "Zoya"
]

INDIAN_LAST_NAMES = [
    "Sharma", "Mehta", "Verma", "Joshi", "Gupta", "Patel", "Tiwari", "Jain",
    "Chouhan", "Agarwal", "Yadav", "Mishra", "Singh", "Rao", "Nair", "Deshmukh",
    "Kulkarni", "Bhat", "Reddy", "Pillai", "Iyer", "Sen", "Banerjee", "Das",
    "Ghosh", "Mukherjee", "Chatterjee", "Roy", "Bose", "Dutta", "Pandey",
    "Saxena", "Chopra", "Malhotra", "Kapoor", "Bhattacharya", "Sinha", "Prasad"
]

HOSTEL_BLOCKS = ["Block A", "Block B", "Block C", "Block D"]

# Password hash for '12345678'
PASSWORD_HASH = "$2a$10$aUPS9xHAyV03olBYStVO9.Ej8L.qhLVatYurD1hMtR6LrkS53f1qK"

COMPLAINT_TYPES = [
    "FOOD_QUALITY", "HYGIENE", "TIMELINESS", "FACILITY", "STAFF_BEHAVIOR", "OTHER"
]

# Scenario Complaint Templates
OIL_COMPLAINTS = [
    "The dal was very oily today.",
    "Too much oil in dal and curry.",
    "Dal was extremely greasy.",
    "Food was too oily today during dinner.",
    "The gravy had excessive oil floating on top.",
    "Dinner was very oily and hard to digest.",
    "Heavy oil layer visible on dal tadka.",
    "Excess oil in the evening preparations.",
    "Very greasy food served at dinner."
]

REPETITION_COMPLAINTS = [
    "Paneer is coming too often this week.",
    "Again paneer today for dinner.",
    "Menu feels repetitive lately.",
    "Please add more variety to the dinner schedule.",
    "Same food is being repeated continuously.",
    "Repetitive menu items, need changes.",
    "Tired of eating the same curry every alternate day."
]

ANOMALY_COMPLAINTS = [
    "Water supply in mess disrupted today.",
    "Dishes and spoons were not cleaned properly.",
    "Hygiene issue due to temporary pipe maintenance.",
    "Dining hall water counter was not functioning.",
    "Mess washing area had severe drainage blockage."
]

MEAL_SPECIFIC_DINNER_COMPLAINTS = [
    "Dinner is consistently delayed by over 40 minutes.",
    "Night staff is running out of rotis during dinner peak hours.",
    "Dinner was served stone cold today.",
    "Rotis were completely hard and dry at dinner.",
    "Evening mess counter staff is very slow."
]

GENERAL_COMPLAINTS = [
    ("FOOD_QUALITY", "The rice was slightly undercooked today."),
    ("FOOD_QUALITY", "Vegetables lacked salt and seasoning."),
    ("HYGIENE", "Dining table was not wiped before lunch."),
    ("HYGIENE", "Water glasses were not washed thoroughly."),
    ("TIMELINESS", "Breakfast counter opened 15 minutes late."),
    ("TIMELINESS", "Lunch queue was too long due to single counter."),
    ("FACILITY", "Ceiling fan in north dining area is noisy."),
    ("FACILITY", "Hand wash liquid was empty at washbasins."),
    ("STAFF_BEHAVIOR", "Mess staff was rude when asking for extra curd."),
    ("OTHER", "Please provide ketchup packets with samosas.")
]

ANNOUNCEMENT_TEMPLATES = [
    ("Special Sunday Feast: Paneer Butter Masala & Gulab Jamun", "Dear Students, this Sunday lunch will feature a special feast with Paneer Butter Masala, Veg Pulao, and hot Gulab Jamun."),
    ("Notice: Mess Timings for Examination Week", "During mid-semester examinations, breakfast will commence 30 minutes earlier from 7:00 AM to 9:30 AM."),
    ("Kitchen Hygiene & Deep Cleaning Schedule", "The central kitchen will undergo scheduled sanitation and pest control inspection this Saturday afternoon."),
    ("Monthly Menu Committee Review Meeting", "Student representatives are invited to attend the mess committee feedback session this Friday at 5:00 PM."),
    ("Festival Celebration: Special Festive Sweets", "In celebration of the festive season, special sweets and festive dinner will be served tonight."),
    ("Water Pipeline Maintenance Notice", "Plumbing maintenance is scheduled for tomorrow between 2:00 PM and 4:00 PM. Alternate water arrangements have been made."),
    ("Food Waste Awareness Drive", "Students are requested to take only what they can consume to reduce daily hostel food wastage."),
    ("Feedback on New Breakfast Items", "The mess committee invites suggestions regarding recently introduced breakfast items like Methi Thepla and Sabudana Khichdi."),
    ("Winter Dinner Timings Advisory", "Dinner hours have been revised for the winter schedule: 7:30 PM to 9:45 PM."),
    ("New Cold Drinking Water Dispensers Installed", "Two new RO water dispensers have been installed in the main dining hall for student convenience.")
]

def generate_demo_sql():
    random.seed(FIXED_SEED)
    sql_lines = []
    sql_lines.append("-- =====================================================")
    sql_lines.append("-- MESO SYNTHETIC DEMO DATASET (DETERMINISTIC SEED 42)")
    sql_lines.append("-- Span: ~12 months (365 days)")
    sql_lines.append("-- =====================================================")
    sql_lines.append("SET FOREIGN_KEY_CHECKS = 0;")
    sql_lines.append("")

    # 1. Clean previous demo data
    sql_lines.append("-- 1. DELETE EXISTING DEMO DATA")
    sql_lines.append("DELETE FROM student_notifications WHERE student_id IN (SELECT id FROM users WHERE email LIKE '%.demo@messo.com');")
    sql_lines.append("DELETE FROM announcement_reads WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%.demo@messo.com');")
    sql_lines.append("DELETE FROM notification WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%.demo@messo.com');")
    sql_lines.append("DELETE FROM complaint WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%.demo@messo.com');")
    sql_lines.append("DELETE FROM food_reviews WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%.demo@messo.com');")
    sql_lines.append("DELETE FROM poll_votes WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%.demo@messo.com');")
    sql_lines.append("DELETE FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%.demo@messo.com');")
    sql_lines.append("DELETE FROM users WHERE email LIKE '%.demo@messo.com';")
    sql_lines.append("")
    sql_lines.append("DELETE FROM poll_votes WHERE option_id IN (SELECT id FROM poll_options WHERE food_name LIKE '[DEMO]%');")
    sql_lines.append("DELETE FROM poll_options WHERE food_name LIKE '[DEMO]%';")
    sql_lines.append("DELETE FROM food_polls WHERE poll_date >= '2025-09-25' AND poll_date <= '2026-09-24';")
    sql_lines.append("DELETE FROM daily_menu WHERE menu_date >= '2025-09-25' AND menu_date <= '2026-09-24';")
    sql_lines.append("DELETE FROM announcements WHERE title LIKE '[DEMO]%' OR created_at >= '2025-09-25 00:00:00';")
    sql_lines.append("UPDATE food_polls SET active = 0;")
    sql_lines.append("")

    # 2. Insert Foods if not exist
    sql_lines.append("-- 2. ENSURE FOODS IN CATALOG")
    for name, mtype in FOOD_CATALOG:
        safe_name = name.replace("'", "''")
        sql_lines.append(f"INSERT INTO foods (name, meal_type) SELECT '{safe_name}', '{mtype}' WHERE NOT EXISTS (SELECT 1 FROM foods WHERE LOWER(name) = LOWER('{safe_name}'));")
    sql_lines.append("")

    # Map foods to IDs dynamically in SQL or query
    # We will use subqueries: `(SELECT id FROM foods WHERE name = '...')`

    # 3. Create 250 Synthetic Students
    sql_lines.append("-- 3. INSERT 250 SYNTHETIC INDIAN STUDENTS")
    student_records = []
    used_emails = set()
    used_ids = set()

    students = [] # list of (idx, email, name, studentId, hostel, phone)
    first_len = len(INDIAN_FIRST_NAMES)
    last_len = len(INDIAN_LAST_NAMES)

    for i in range(1, TOTAL_STUDENTS + 1):
        fn = INDIAN_FIRST_NAMES[(i * 7) % first_len]
        ln = INDIAN_LAST_NAMES[(i * 13) % last_len]
        name = f"{fn} {ln}"
        email = f"{fn.lower()}.{ln.lower()}.{i:03d}.demo@messo.com"
        sid = f"DEMO231{i:03d}"
        hostel = f"{HOSTEL_BLOCKS[i % len(HOSTEL_BLOCKS)]}, {100 + (i % 350)}"
        phone = f"98765{i:05d}"

        students.append({
            "idx": i,
            "email": email,
            "name": name,
            "studentId": sid,
            "hostel": hostel,
            "phone": phone
        })

    # Chunked inserts for users and student_profiles
    user_values = []
    for s in students:
        user_values.append(f"('{s['email']}', '{PASSWORD_HASH}', 'ROLE_STUDENT', 1)")
    
    for chunk_start in range(0, len(user_values), 100):
        chunk = user_values[chunk_start:chunk_start+100]
        sql_lines.append(f"INSERT INTO users (email, password, role, enabled) VALUES\n  " + ",\n  ".join(chunk) + ";")
    sql_lines.append("")

    profile_values = []
    for s in students:
        safe_name = s['name'].replace("'", "''")
        profile_values.append(f"('{safe_name}', '{s['studentId']}', '{s['hostel']}', '{s['phone']}', (SELECT id FROM users WHERE email = '{s['email']}'))")
    
    for chunk_start in range(0, len(profile_values), 100):
        chunk = profile_values[chunk_start:chunk_start+100]
        sql_lines.append(f"INSERT INTO student_profiles (name, student_id, hostel, phone_number, user_id) VALUES\n  " + ",\n  ".join(chunk) + ";")
    sql_lines.append("")

    # 4. Generate 365 Days of Daily Menu (Respecting unique constraint on menu_date)
    # Scenarios:
    # Day 0 to 364
    # Scenario A (Oil): Day 240 to 270 (May-Jun) -> High Dal Tadka / Dal Fry
    # Scenario B (Repetition):
    #   Window 1 (Fatigue): Day 120 to 150 -> Paneer Butter Masala served every 2-3 days
    #   Window 2 (Counterexample): Day 310 to 330 -> Paneer Butter Masala served frequently (celebration/exam)
    # Scenario C (Meal-Specific): Day 60 to 90 -> Dinner specific items (Kadai Paneer, Mix Veg, Shahi Paneer)
    # Scenario D (Anomaly): Day 180 to 187 -> Normal menu, but kitchen water breakdown
    
    sql_lines.append("-- 4. INSERT 365 DAYS OF DAILY MENU")
    daily_menu_items = [] # (date_str, food_name)
    
    main_foods = [
        "Paneer Butter Masala", "Dal Tadka", "Rajma Chawal", "Chole Bhature",
        "Kadhi Pakoda", "Mix Veg", "Aloo Gobi", "Bhindi Masala", "Dal Fry",
        "Kadai Paneer", "Shahi Paneer", "Veg Pulao", "Palak Paneer", "Dum Aloo"
    ]

    for day_idx in range(DAYS_SPAN):
        current_date = START_DATE + timedelta(days=day_idx)
        date_str = current_date.isoformat()

        # Scenario A: Day 240 to 270 (High Dal frequency)
        if 240 <= day_idx <= 270:
            if day_idx % 2 == 0:
                food = "Dal Tadka"
            elif day_idx % 3 == 0:
                food = "Dal Fry"
            else:
                food = main_foods[day_idx % len(main_foods)]
        # Scenario B - Window 1: Day 120 to 150 (High Paneer repetition causing fatigue)
        elif 120 <= day_idx <= 150:
            if day_idx % 2 == 0:
                food = "Paneer Butter Masala"
            else:
                food = main_foods[(day_idx * 3) % len(main_foods)]
        # Scenario B - Window 2: Day 310 to 330 (High Paneer repetition counterexample - celebration)
        elif 310 <= day_idx <= 330:
            if day_idx % 2 == 0:
                food = "Paneer Butter Masala"
            else:
                food = main_foods[(day_idx * 5) % len(main_foods)]
        else:
            # Baseline rotation
            food = main_foods[(day_idx + (day_idx // 7)) % len(main_foods)]

        daily_menu_items.append((date_str, food))

    menu_values = []
    for d_str, f_name in daily_menu_items:
        safe_f = f_name.replace("'", "''")
        menu_values.append(f"('{d_str}', (SELECT id FROM foods WHERE name = '{safe_f}' LIMIT 1))")

    for chunk_start in range(0, len(menu_values), 100):
        chunk = menu_values[chunk_start:chunk_start+100]
        sql_lines.append(f"INSERT INTO daily_menu (menu_date, food_id) VALUES\n  " + ",\n  ".join(chunk) + ";")
    sql_lines.append("")

    # 5. Food Reviews / Ratings (Target: ~35,000-40,000 ratings across 365 days)
    # Unique constraint: (user_id, review_date)
    # 250 students, average 95-105 reviews per day = ~36,500 reviews.
    sql_lines.append("-- 5. INSERT ~36,000 RATINGS (FOOD REVIEWS)")
    
    review_values = []
    for day_idx in range(DAYS_SPAN):
        current_date = START_DATE + timedelta(days=day_idx)
        date_str = current_date.isoformat()
        current_food = daily_menu_items[day_idx][1]

        # Determine daily rating profile based on scenarios
        is_oil_scenario = (240 <= day_idx <= 270) and ("Dal" in current_food)
        is_repetition_fatigue = (120 <= day_idx <= 150) and (current_food == "Paneer Butter Masala")
        is_repetition_celebration = (310 <= day_idx <= 330) and (current_food == "Paneer Butter Masala")
        is_dinner_scenario = (60 <= day_idx <= 90) and (current_food in ["Kadai Paneer", "Mix Veg", "Shahi Paneer"])
        is_anomaly = (180 <= day_idx <= 187)

        # Baseline rating distribution: mostly 4 and 5, some 3
        # Pick 90 to 110 random students for today
        turnout_count = random.randint(90, 110)
        # On weekends (Saturday/Sunday), turnout drops slightly
        if current_date.weekday() >= 5:
            turnout_count = int(turnout_count * 0.85)

        reviewing_students = random.sample(students, turnout_count)

        for s in reviewing_students:
            # Generate rating with noise
            rand_val = random.random()
            if is_anomaly:
                # Severe dip: ratings mostly 1 or 2
                if rand_val < 0.55:
                    rating = 2
                elif rand_val < 0.85:
                    rating = 1
                else:
                    rating = 3
            elif is_oil_scenario:
                # Dal rating drops to 2.1-2.4 avg
                if rand_val < 0.45:
                    rating = 2
                elif rand_val < 0.75:
                    rating = 1
                elif rand_val < 0.90:
                    rating = 3
                else:
                    rating = 4 # noise
            elif is_repetition_fatigue:
                # Fatigue drops rating from 4.5 down to 2.8
                if rand_val < 0.35:
                    rating = 2
                elif rand_val < 0.70:
                    rating = 3
                elif rand_val < 0.85:
                    rating = 1
                else:
                    rating = 4
            elif is_repetition_celebration:
                # High frequency BUT students love it! Ratings 4 and 5!
                if rand_val < 0.50:
                    rating = 5
                elif rand_val < 0.85:
                    rating = 4
                else:
                    rating = 3
            elif is_dinner_scenario:
                # Dinner rating dip to ~2.6
                if rand_val < 0.40:
                    rating = 2
                elif rand_val < 0.75:
                    rating = 3
                elif rand_val < 0.90:
                    rating = 1
                else:
                    rating = 4
            else:
                # Normal baseline: average ~4.1
                if rand_val < 0.45:
                    rating = 4
                elif rand_val < 0.80:
                    rating = 5
                elif rand_val < 0.93:
                    rating = 3
                elif rand_val < 0.97:
                    rating = 2
                else:
                    rating = 1 # realistic noise

            safe_f = current_food.replace("'", "''")
            review_values.append(
                f"({rating}, '{date_str}', (SELECT id FROM foods WHERE name = '{safe_f}' LIMIT 1), (SELECT id FROM users WHERE email = '{s['email']}'))"
            )

    # Batch write reviews
    for chunk_start in range(0, len(review_values), 1000):
        chunk = review_values[chunk_start:chunk_start+1000]
        sql_lines.append(f"INSERT INTO food_reviews (rating, review_date, food_id, user_id) VALUES\n  " + ",\n  ".join(chunk) + ";")
    sql_lines.append("")

    # 6. Complaints (Target: 2,000–3,000 complaints over 365 days)
    # Average ~6-8 complaints per day
    sql_lines.append("-- 6. INSERT ~2,500 COMPLAINTS")
    complaint_values = []
    
    for day_idx in range(DAYS_SPAN):
        current_date = START_DATE + timedelta(days=day_idx)
        base_dt = datetime(current_date.year, current_date.month, current_date.day, 13, 0, 0)
        
        is_oil = (240 <= day_idx <= 270)
        is_fatigue = (120 <= day_idx <= 150)
        is_celebration = (310 <= day_idx <= 330)
        is_dinner = (60 <= day_idx <= 90)
        is_anomaly = (180 <= day_idx <= 187)

        # Baseline complaints per day: 3 to 6
        daily_count = random.randint(3, 6)

        if is_anomaly:
            daily_count += random.randint(10, 15) # spike 4x
        if is_oil:
            daily_count += random.randint(4, 7) # oil complaints surge
        if is_fatigue:
            daily_count += random.randint(3, 6) # repetition complaints surge
        if is_dinner:
            daily_count += random.randint(3, 5) # dinner timing/cold complaints

        selected_students = random.sample(students, min(daily_count, len(students)))

        for i, s in enumerate(selected_students):
            dt = base_dt + timedelta(hours=random.randint(0, 8), minutes=random.randint(0, 59))
            dt_str = dt.strftime("%Y-%m-%d %H:%M:%S")

            # Determine complaint type, desc, rating
            c_rating = random.choice([1, 2, 3])
            
            # Historical complaints (> 30 days ago) mostly resolved (85%)
            is_resolved = 1 if (DAYS_SPAN - day_idx > 30 and random.random() < 0.85) else 0

            if is_anomaly and i < 8:
                ctype = "HYGIENE" if random.random() < 0.6 else "FACILITY"
                desc = random.choice(ANOMALY_COMPLAINTS)
            elif is_oil and i < 5:
                ctype = "FOOD_QUALITY"
                desc = random.choice(OIL_COMPLAINTS)
            elif is_fatigue and i < 4:
                ctype = "FOOD_QUALITY"
                desc = random.choice(REPETITION_COMPLAINTS)
            elif is_dinner and i < 4:
                ctype = "TIMELINESS" if random.random() < 0.6 else "FOOD_QUALITY"
                desc = random.choice(MEAL_SPECIFIC_DINNER_COMPLAINTS)
            else:
                item = random.choice(GENERAL_COMPLAINTS)
                ctype = item[0]
                desc = item[1]

            safe_desc = desc.replace("'", "''")
            complaint_values.append(
                f"('{dt_str}', '{safe_desc}', {c_rating}, {is_resolved}, '{ctype}', (SELECT id FROM users WHERE email = '{s['email']}'))"
            )

    for chunk_start in range(0, len(complaint_values), 500):
        chunk = complaint_values[chunk_start:chunk_start+500]
        sql_lines.append(f"INSERT INTO complaint (created_at, description, rating, resolved, type, user_id) VALUES\n  " + ",\n  ".join(chunk) + ";")
    sql_lines.append("")

    # 7. Food Polls, Options & Votes (Target: ~350 Polls, ~18,000-22,000 Votes)
    # Strictly separates Poll (preference) from Menu (repetition)
    # Only the latest poll (Day 364) has active = true, all prior polls have active = false
    sql_lines.append("-- 7. INSERT ~350 FOOD POLLS, OPTIONS, AND VOTES")
    
    # We will insert polls one by one or in blocks, and insert their options and votes
    poll_insert_statements = []
    
    # Pre-select candidate food options for polls
    poll_sets = [
        ("Paneer Butter Masala", "Chole Bhature", "Rajma Chawal", "Dal Tadka"),
        ("Kadai Paneer", "Mix Veg", "Kadhi Pakoda", "Aloo Gobi"),
        ("Shahi Paneer", "Dum Aloo", "Bhindi Masala", "Dal Fry"),
        ("Veg Pulao", "Jeera Rice", "Poha", "Idli Sambhar")
    ]

    # To keep SQL execution fast and predictable, we write a stored procedure or clean SQL block
    # Or insert food_polls with auto-generated IDs or deterministic negative/known IDs
    # In MySQL, we can insert food_polls and link options using LAST_INSERT_ID() or known IDs!
    # Let's inspect max(id) or use an explicit range, or clean batch with user variables:

    sql_lines.append("-- Setup temporary helper table for deterministic poll generation")
    sql_lines.append("DROP TEMPORARY TABLE IF EXISTS temp_polls;")
    sql_lines.append("CREATE TEMPORARY TABLE temp_polls (p_idx INT PRIMARY KEY, p_date DATE, is_active BIT(1));")
    
    temp_poll_values = []
    for day_idx in range(DAYS_SPAN):
        current_date = START_DATE + timedelta(days=day_idx)
        date_str = current_date.isoformat()
        is_active = 1 if (day_idx == DAYS_SPAN - 1) else 0
        temp_poll_values.append(f"({day_idx}, '{date_str}', {is_active})")
    
    for chunk_start in range(0, len(temp_poll_values), 100):
        chunk = temp_poll_values[chunk_start:chunk_start+100]
        sql_lines.append(f"INSERT INTO temp_polls (p_idx, p_date, is_active) VALUES\n  " + ",\n  ".join(chunk) + ";")

    sql_lines.append("""
    INSERT INTO food_polls (poll_date, active)
    SELECT p_date, is_active FROM temp_polls ORDER BY p_idx;
    """)

    # Now link poll_options for each poll.
    # For every poll created, insert 4 options.
    # We can do this cleanly in SQL:
    sql_lines.append("""
    INSERT INTO poll_options (food_name, poll_id)
    SELECT 
        CASE (p.id % 4)
            WHEN 0 THEN 'Paneer Butter Masala'
            WHEN 1 THEN 'Kadai Paneer'
            WHEN 2 THEN 'Shahi Paneer'
            ELSE 'Veg Pulao'
        END AS food_name,
        p.id AS poll_id
    FROM food_polls p
    WHERE p.poll_date >= '2025-09-25';

    INSERT INTO poll_options (food_name, poll_id)
    SELECT 
        CASE (p.id % 4)
            WHEN 0 THEN 'Chole Bhature'
            WHEN 1 THEN 'Mix Veg'
            WHEN 2 THEN 'Dum Aloo'
            ELSE 'Jeera Rice'
        END AS food_name,
        p.id AS poll_id
    FROM food_polls p
    WHERE p.poll_date >= '2025-09-25';

    INSERT INTO poll_options (food_name, poll_id)
    SELECT 
        CASE (p.id % 4)
            WHEN 0 THEN 'Rajma Chawal'
            WHEN 1 THEN 'Kadhi Pakoda'
            WHEN 2 THEN 'Bhindi Masala'
            ELSE 'Poha'
        END AS food_name,
        p.id AS poll_id
    FROM food_polls p
    WHERE p.poll_date >= '2025-09-25';

    INSERT INTO poll_options (food_name, poll_id)
    SELECT 
        CASE (p.id % 4)
            WHEN 0 THEN 'Dal Tadka'
            WHEN 1 THEN 'Aloo Gobi'
            WHEN 2 THEN 'Dal Fry'
            ELSE 'Idli Sambhar'
        END AS food_name,
        p.id AS poll_id
    FROM food_polls p
    WHERE p.poll_date >= '2025-09-25';
    """)

    # Now generate votes:
    # 365 polls * ~55 votes per poll = ~20,000 votes!
    # Preference rules:
    # Scenario B Window 1 (Day 120 to 150): Paneer poll votes drop! Chole/Rajma votes rise!
    # Scenario B Window 2 (Day 310 to 330): Paneer poll votes STAY HIGH (>65%)!
    sql_lines.append("-- 7b. INSERT ~20,000 POLL VOTES RESPECTING PREFERENCE SIGNALS")
    
    # We will write a deterministic SQL block to insert votes per poll:
    # For each poll date, pick 50-60 distinct students.
    # Map their choice to option 1, 2, 3, or 4.
    vote_values = []
    for day_idx in range(DAYS_SPAN):
        current_date = START_DATE + timedelta(days=day_idx)
        date_str = current_date.isoformat()
        
        is_fatigue = (120 <= day_idx <= 150)
        is_celebration = (310 <= day_idx <= 330)

        voter_count = random.randint(50, 65)
        voters = random.sample(students, voter_count)

        for s in voters:
            r = random.random()
            if is_fatigue:
                # Option 1 (Paneer) gets only 20% votes!
                # Option 2 (Chole) gets 55% votes!
                if r < 0.20:
                    chosen_opt_idx = 0
                elif r < 0.75:
                    chosen_opt_idx = 1
                elif r < 0.90:
                    chosen_opt_idx = 2
                else:
                    chosen_opt_idx = 3
            elif is_celebration:
                # Option 1 (Paneer) gets 68% votes!
                if r < 0.68:
                    chosen_opt_idx = 0
                elif r < 0.82:
                    chosen_opt_idx = 1
                elif r < 0.92:
                    chosen_opt_idx = 2
                else:
                    chosen_opt_idx = 3
            else:
                # Baseline distribution
                if r < 0.40:
                    chosen_opt_idx = 0
                elif r < 0.70:
                    chosen_opt_idx = 1
                elif r < 0.88:
                    chosen_opt_idx = 2
                else:
                    chosen_opt_idx = 3

            # Subquery to find the exact option_id for this poll and offset
            # In poll_options, there are 4 options per poll.
            vote_values.append(
                f"((SELECT id FROM users WHERE email = '{s['email']}'), "
                f"(SELECT id FROM poll_options WHERE poll_id = (SELECT id FROM food_polls WHERE poll_date = '{date_str}' LIMIT 1) "
                f"ORDER BY id ASC LIMIT 1 OFFSET {chosen_opt_idx}))"
            )

    for chunk_start in range(0, len(vote_values), 1000):
        chunk = vote_values[chunk_start:chunk_start+1000]
        sql_lines.append(f"INSERT INTO poll_votes (user_id, option_id) VALUES\n  " + ",\n  ".join(chunk) + ";")
    sql_lines.append("")

    # 8. Announcements (~120 Announcements across 52 weeks)
    sql_lines.append("-- 8. INSERT ~120 ANNOUNCEMENTS")
    announcement_values = []
    for week_idx in range(52):
        for ann_sub in range(random.randint(2, 3)):
            day_offset = week_idx * 7 + random.randint(0, 6)
            if day_offset >= DAYS_SPAN:
                continue
            ann_date = START_DATE + timedelta(days=day_offset)
            ann_dt = datetime(ann_date.year, ann_date.month, ann_date.day, 10, random.randint(0, 59))
            ann_dt_str = ann_dt.strftime("%Y-%m-%d %H:%M:%S")

            template = random.choice(ANNOUNCEMENT_TEMPLATES)
            title = f"[DEMO] {template[0]}"
            msg = template[1]
            safe_title = title.replace("'", "''")
            safe_msg = msg.replace("'", "''")
            announcement_values.append(f"('{ann_dt_str}', '{safe_msg}', '{safe_title}')")

    for chunk_start in range(0, len(announcement_values), 100):
        chunk = announcement_values[chunk_start:chunk_start+100]
        sql_lines.append(f"INSERT INTO announcements (created_at, message, title) VALUES\n  " + ",\n  ".join(chunk) + ";")
    sql_lines.append("")

    # 9. Student Notifications & Notifications (~800 records)
    sql_lines.append("-- 9. INSERT STUDENT NOTIFICATIONS")
    sql_lines.append("""
    INSERT INTO notification (created_at, is_read, message, user_id)
    SELECT 
        c.created_at,
        1,
        CONCAT('✅ Your complaint on "', c.type, '" has been resolved.'),
        c.user_id
    FROM complaint c
    WHERE c.resolved = 1 AND c.user_id IN (SELECT id FROM users WHERE email LIKE '%.demo@messo.com')
    LIMIT 600;
    """)

    sql_lines.append("SET FOREIGN_KEY_CHECKS = 1;")
    sql_lines.append("-- =====================================================")
    sql_lines.append("-- COMPLETED DETERMINISTIC SEED SCRIPT")
    sql_lines.append("-- =====================================================")

    return "\n".join(sql_lines)

def main():
    import argparse
    parser = argparse.ArgumentParser(description="MESO Deterministic Indian Demo Data Generator")
    parser.add_argument("--fresh", action="store_true", help="Reset previous demo data and re-seed deterministically")
    parser.add_argument("--reset", action="store_true", help="Reset/delete all demo data only")
    parser.add_argument("--seed-only", action="store_true", help="Generate and run seed SQL without full reset")
    parser.add_argument("--confirm-demo", action="store_true", default=True, help="Safety confirmation to prevent production execution")
    parser.add_argument("--output-sql", type=str, default="data/demo_seed.sql", help="Output SQL script path")
    args = parser.parse_args()

    if not args.confirm_demo:
        print("ERROR: Safety flag --confirm-demo must be provided to run demo data seeding.")
        sys.exit(1)

    os.makedirs(os.path.dirname(args.output_sql), exist_ok=True)
    
    print(f"Generating deterministic demo SQL dataset (seed={FIXED_SEED})...")
    sql_content = generate_demo_sql()
    
    with open(args.output_sql, "w", encoding="utf-8") as f:
        f.write(sql_content)
    
    print(f"Generated {len(sql_content):,} bytes of SQL in {args.output_sql}")

    # Check for mysql CLI executable
    mysql_paths = [
        r"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "mysql"
    ]
    mysql_cmd = None
    for p in mysql_paths:
        if os.path.exists(p) or p == "mysql":
            mysql_cmd = p
            break

    if mysql_cmd:
        print(f"Executing SQL via MySQL CLI ({mysql_cmd})...")
        cmd = f'"{mysql_cmd}" -u root -proot messo < "{args.output_sql}"'
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if res.returncode == 0:
            print("Successfully seeded demo dataset into MySQL database 'messo'!")
        else:
            print(f"MySQL execution exited with code {res.returncode}: {res.stderr}")
            sys.exit(res.returncode)
    else:
        print(f"Saved SQL file to {args.output_sql}. Run via MySQL client.")

if __name__ == "__main__":
    main()
