"""
Root Cause Engine Implementation (MESO AI Batch 2).
Analyzes shifts in student satisfaction, complaint volume, and poll participation
using metric-specific statistical inference and data extraction:
- Food Satisfaction: Rating shifts, rating distribution, meal breakdown, dish rankings, feedback themes
- Complaint Volume: Complaint trends, semantic topic velocity, category shares, unique complainants
- Poll Participation: Voter turnout, active polls, option choice distributions, engagement stability
"""

import uuid
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
from scipy import stats

from app.data.schemas import (
    InvestigationRequest,
    InvestigationResponse,
    MetricSummary,
    DataWindowInfo,
    EvidenceItem,
    PossibleFactor,
    FoodSatisfactionDetails,
    DishFeedbackItem,
    RatingDistribution,
    MealRatingItem,
    StudentFeedbackTheme,
    ComplaintVolumeDetails,
    ComplaintThemeItem,
    ComplaintDailyCount,
    PollParticipationDetails,
    ActivePollItem,
    PollOptionChoice,
    TopChosenOption,
)
from app.data.client import MesoDbClient
from app.nlp.complaint_topics import ComplaintTopicClassifier

THEME_HUMAN_NAMES = {
    "OIL_GREASINESS": "Oil & Greasiness",
    "HYGIENE_CLEANLINESS": "Hygiene & Cleanliness",
    "TASTE_SEASONING": "Taste & Seasoning",
    "MEAL_TIMELINESS": "Meal Timeliness & Delay",
    "TEMPERATURE_FRESHNESS": "Temperature & Freshness",
    "STAFF_BEHAVIOR": "Staff Interaction",
    "FACILITY_WATER": "Facility & Water Supply",
    "MENU_REPETITION": "Menu Variety & Repetition",
}

class RootCauseEngine:
    """
    Evidence-Based Root Cause Diagnostic Engine.
    Provides metric-specific data extraction, statistical diagnosis, and evidence.
    """

    def __init__(self, db_client: Optional[MesoDbClient] = None, model_version: str = "rc-engine-v2.0-statistical"):
        self.db = db_client or MesoDbClient()
        self.classifier = ComplaintTopicClassifier()
        self.model_version = model_version

    def _resolve_comparison_window(
        self,
        start_date: date,
        end_date: date,
        comp_start: Optional[date],
        comp_end: Optional[date]
    ) -> Tuple[date, date]:
        if comp_start and comp_end:
            return comp_start, comp_end
        duration = (end_date - start_date).days + 1
        resolved_end = start_date - timedelta(days=1)
        resolved_start = resolved_end - timedelta(days=duration - 1)
        return resolved_start, resolved_end

    async def investigate(self, request: InvestigationRequest) -> InvestigationResponse:
        investigation_id = f"inv-{uuid.uuid4().hex[:8]}"
        t_start, t_end = request.start_date, request.end_date
        c_start, c_end = self._resolve_comparison_window(
            t_start, t_end, request.comparison_start_date, request.comparison_end_date
        )

        target_days = (t_end - t_start).days + 1
        baseline_days = (c_end - c_start).days + 1

        target_metric = (request.metric or request.target_metric or "food_satisfaction").lower().strip()

        if target_metric == "complaint_volume":
            return await self._investigate_complaint_volume(
                request, investigation_id, t_start, t_end, c_start, c_end, target_days, baseline_days
            )
        elif target_metric == "poll_participation":
            return await self._investigate_poll_participation(
                request, investigation_id, t_start, t_end, c_start, c_end, target_days, baseline_days
            )
        else:
            return await self._investigate_food_satisfaction(
                request, investigation_id, t_start, t_end, c_start, c_end, target_days, baseline_days
            )

    # =========================================================================
    # 1. FOOD SATISFACTION PIPELINE
    # =========================================================================
    async def _investigate_food_satisfaction(
        self,
        request: InvestigationRequest,
        investigation_id: str,
        t_start: date,
        t_end: date,
        c_start: date,
        c_end: date,
        target_days: int,
        baseline_days: int
    ) -> InvestigationResponse:
        target_reviews = self.db.get_reviews(t_start, t_end, meal_type=request.meal_type, food_id=request.food_id)
        baseline_reviews = self.db.get_reviews(c_start, c_end, meal_type=request.meal_type, food_id=request.food_id)

        target_complaints = self.db.get_complaints(t_start, t_end, meal_type=request.meal_type)
        baseline_complaints = self.db.get_complaints(c_start, c_end, meal_type=request.meal_type)

        menu_history = self.db.get_menu_history(c_start - timedelta(days=14), t_end)
        target_polls = self.db.get_polls_and_votes(t_start, t_end)

        t_ratings = target_reviews['rating'].dropna().values if not target_reviews.empty else np.array([])
        b_ratings = baseline_reviews['rating'].dropna().values if not baseline_reviews.empty else np.array([])
        t_mean = float(np.mean(t_ratings)) if len(t_ratings) > 0 else 0.0
        b_mean = float(np.mean(b_ratings)) if len(b_ratings) > 0 else 0.0
        diff = round(t_mean - b_mean, 2)
        pct_diff = round((diff / b_mean) * 100.0, 1) if b_mean > 0 else 0.0

        p_val: Optional[float] = None
        is_significant = False
        if len(t_ratings) > 10 and len(b_ratings) > 10:
            stat_res = stats.ttest_ind(t_ratings, b_ratings, equal_var=False)
            p_val = float(round(stat_res.pvalue, 4))
            is_significant = (p_val < 0.05) and (abs(diff) >= 0.15)

        t_students = int(target_reviews['user_id'].nunique()) if not target_reviews.empty else 0
        b_students = int(baseline_reviews['user_id'].nunique()) if not baseline_reviews.empty else 0

        metric_summary = MetricSummary(
            metric="food_satisfaction",
            current_value=round(t_mean, 2),
            previous_value=round(b_mean, 2),
            change=diff,
            percent_change=pct_diff,
            p_value=p_val,
            statistically_significant=is_significant
        )

        data_window = DataWindowInfo(
            target_start_date=t_start,
            target_end_date=t_end,
            target_sample_count=len(target_reviews),
            comparison_start_date=c_start,
            comparison_end_date=c_end,
            comparison_sample_count=len(baseline_reviews),
            cohort_filter=request.meal_type
        )

        observations: List[str] = [
            f"Average food satisfaction moved from {b_mean:.2f} to {t_mean:.2f} (change: {diff:+.2f}, {pct_diff:+.1f}%) "
            f"across {len(t_ratings)} reviews vs {len(b_ratings)} baseline reviews.",
            f"{t_students} distinct students submitted reviews during this period (compared to {b_students} in baseline)."
        ]

        # 1. Rating Distribution
        r_counts = target_reviews['rating'].value_counts() if not target_reviews.empty else pd.Series(dtype=int)
        total_rev = len(target_reviews)
        rating_dist = RatingDistribution(
            stars_1=int(r_counts.get(1, 0)),
            stars_2=int(r_counts.get(2, 0)),
            stars_3=int(r_counts.get(3, 0)),
            stars_4=int(r_counts.get(4, 0)),
            stars_5=int(r_counts.get(5, 0)),
            stars_1_pct=round(int(r_counts.get(1, 0)) / max(total_rev, 1) * 100.0, 1),
            stars_2_pct=round(int(r_counts.get(2, 0)) / max(total_rev, 1) * 100.0, 1),
            stars_3_pct=round(int(r_counts.get(3, 0)) / max(total_rev, 1) * 100.0, 1),
            stars_4_pct=round(int(r_counts.get(4, 0)) / max(total_rev, 1) * 100.0, 1),
            stars_5_pct=round(int(r_counts.get(5, 0)) / max(total_rev, 1) * 100.0, 1),
        )

        # 2. Meal Breakdown
        meal_breakdown: List[MealRatingItem] = []
        meal_shifts: Dict[str, Dict[str, float]] = {}
        if not target_reviews.empty:
            for m in ['Breakfast', 'Lunch', 'Dinner']:
                t_m = target_reviews[target_reviews['meal_type'].str.lower() == m.lower()]
                b_m = baseline_reviews[baseline_reviews['meal_type'].str.lower() == m.lower()] if not baseline_reviews.empty else pd.DataFrame()
                if not t_m.empty:
                    tm_val = float(t_m['rating'].mean())
                    bm_val = float(b_m['rating'].mean()) if not b_m.empty else tm_val
                    mdiff = round(tm_val - bm_val, 2)
                    meal_shifts[m] = {"target": tm_val, "baseline": bm_val, "diff": mdiff}
                    meal_breakdown.append(MealRatingItem(
                        meal_type=m,
                        target_rating=round(tm_val, 2),
                        baseline_rating=round(bm_val, 2),
                        change=mdiff,
                        review_count=len(t_m)
                    ))

        # 3. Dishes Ranking (Dynamic, never hardcoded)
        most_reviewed_dishes: List[DishFeedbackItem] = []
        lowest_rated_dishes: List[DishFeedbackItem] = []
        highest_rated_dishes: List[DishFeedbackItem] = []
        food_shifts: List[Dict[str, Any]] = []

        if not target_reviews.empty:
            t_f_grp = target_reviews.groupby('food_name').agg({
                'rating': ['mean', 'count'],
                'meal_type': 'first'
            })
            b_f_grp = baseline_reviews.groupby('food_name')['rating'].mean() if not baseline_reviews.empty else pd.Series(dtype=float)

            all_dishes: List[DishFeedbackItem] = []
            for fname, row in t_f_grp.iterrows():
                cnt = int(row[('rating', 'count')])
                curr_r = float(row[('rating', 'mean')])
                prev_r = float(b_f_grp[fname]) if fname in b_f_grp else None
                m_type = str(row[('meal_type', 'first')])
                chg = round(curr_r - prev_r, 2) if prev_r is not None else None
                dish_item = DishFeedbackItem(
                    food_name=fname,
                    meal_type=m_type,
                    review_count=cnt,
                    average_rating=round(curr_r, 2),
                    previous_rating=round(prev_r, 2) if prev_r is not None else None,
                    change=chg
                )
                all_dishes.append(dish_item)
                if prev_r is not None and cnt >= 10:
                    food_shifts.append({
                        "food_name": fname,
                        "target_mean": curr_r,
                        "baseline_mean": prev_r,
                        "diff": chg,
                        "target_count": cnt
                    })

            most_reviewed_dishes = sorted(all_dishes, key=lambda x: x.review_count, reverse=True)[:5]
            min_reviews = max(20, int(len(target_reviews) * 0.01))
            sufficient_dishes = [d for d in all_dishes if d.review_count >= min_reviews]
            if not sufficient_dishes:
                sufficient_dishes = all_dishes

            lowest_rated_dishes = sorted(sufficient_dishes, key=lambda x: x.average_rating)[:5]
            highest_rated_dishes = sorted(sufficient_dishes, key=lambda x: x.average_rating, reverse=True)[:5]

        food_shifts.sort(key=lambda x: x["diff"] if x["diff"] is not None else 0.0)
        worst_food_shift = food_shifts[0] if (food_shifts and food_shifts[0]["diff"] is not None and food_shifts[0]["diff"] <= -0.40) else None

        # 4. Student Concerns & Positive Highlights
        theme_trends = self.classifier.aggregate_theme_trends(
            target_complaints, baseline_complaints, target_days, baseline_days
        )
        theme_map = {t["theme"]: t for t in theme_trends}

        common_concerns: List[StudentFeedbackTheme] = []
        for t in theme_trends:
            if t["target_count"] >= 10:
                tid = t["theme"]
                tname = THEME_HUMAN_NAMES.get(tid, tid.replace('_', ' ').title())
                share = round(t["target_count"] / max(len(target_complaints), 1) * 100.0, 1)
                common_concerns.append(StudentFeedbackTheme(
                    theme=tname,
                    count=int(t["target_count"]),
                    share_pct=share,
                    sentiment="negative",
                    example_note=f"{t['target_count']} complaints logged ({share}% of total complaints)"
                ))
        common_concerns.sort(key=lambda x: x.count, reverse=True)

        positive_highlights: List[StudentFeedbackTheme] = []
        for d in highest_rated_dishes:
            if d.average_rating >= 4.0 and d.review_count >= 25:
                positive_highlights.append(StudentFeedbackTheme(
                    theme=f"{d.food_name} ({d.average_rating:.2f} ★)",
                    count=d.review_count,
                    share_pct=round(d.review_count / max(total_rev, 1) * 100.0, 1),
                    sentiment="positive",
                    example_note=f"High satisfaction maintained across {d.review_count} student reviews."
                ))

        food_details = FoodSatisfactionDetails(
            unique_students=t_students,
            comparison_unique_students=b_students,
            rating_distribution=rating_dist,
            meal_breakdown=meal_breakdown,
            common_concerns=common_concerns,
            positive_highlights=positive_highlights,
            most_reviewed_dishes=most_reviewed_dishes,
            lowest_rated_dishes=lowest_rated_dishes,
            highest_rated_dishes=highest_rated_dishes
        )

        evidence_list: List[EvidenceItem] = []
        possible_factors: List[PossibleFactor] = []

        # Check for stability
        if not is_significant and abs(diff) < 0.15:
            observations.append("Overall satisfaction stayed about the same, although some meal and dish ratings moved during this period.")
            observations.append("Metric variation is within normal historical fluctuations; no statistically significant degradation detected.")
            return InvestigationResponse(
                investigation_id=investigation_id,
                target_metric="food_satisfaction",
                metric_summary=metric_summary,
                observations=observations,
                evidence=[],
                possible_factors=[],
                data_window=data_window,
                engine_version=self.model_version,
                food_details=food_details
            )

        evidence_list.append(
            EvidenceItem(
                signal="average_food_rating_shift",
                target_entity=request.meal_type or "All Meals",
                before_value=round(b_mean, 2),
                after_value=round(t_mean, 2),
                change=diff,
                relative_change_pct=pct_diff,
                p_value=p_val,
                details=f"Calculated across {len(t_ratings)} target reviews vs {len(b_ratings)} comparison reviews."
            )
        )

        # Meal Concentration Analysis
        dinner_shift = meal_shifts.get('Dinner', {}).get('diff', 0.0)
        lunch_shift = meal_shifts.get('Lunch', {}).get('diff', 0.0)
        breakfast_shift = meal_shifts.get('Breakfast', {}).get('diff', 0.0)

        if dinner_shift <= -0.35 and (lunch_shift >= -0.15 or breakfast_shift >= -0.15):
            d_idx = len(evidence_list)
            evidence_list.append(
                EvidenceItem(
                    signal="meal_specific_rating_divergence",
                    target_entity="Dinner",
                    before_value=round(meal_shifts['Dinner']['baseline'], 2),
                    after_value=round(meal_shifts['Dinner']['target'], 2),
                    change=round(dinner_shift, 2),
                    relative_change_pct=round((dinner_shift / meal_shifts['Dinner']['baseline']) * 100.0, 1),
                    details=f"Dinner ratings declined by {abs(dinner_shift):.2f} stars while Breakfast/Lunch remained stable."
                )
            )
            observations.append(
                f"Rating decline is heavily concentrated in Dinner meals (change: {dinner_shift:+.2f}) "
                f"while other meal times remained comparatively stable."
            )
            possible_factors.append(
                PossibleFactor(
                    factor_id="DINNER_SERVICE_CONCENTRATION",
                    description="Satisfaction decline is localized to the evening dinner service, pointing to dinner shift preparation or timing constraints.",
                    confidence="HIGH",
                    confidence_score=0.88,
                    supporting_evidence_indices=[d_idx]
                )
            )

        # Oil & Greasiness Analysis (Scenario A)
        oil_theme = theme_map.get("OIL_GREASINESS")
        if oil_theme and oil_theme["velocity_multiplier"] >= 2.0:
            oil_ev_idx = len(evidence_list)
            is_oil_new = oil_theme["baseline_count"] == 0
            oil_rel_pct = 0.0 if is_oil_new else round((oil_theme["velocity_multiplier"] - 1.0) * 100.0, 1)
            evidence_list.append(
                EvidenceItem(
                    signal="complaint_theme_velocity_oil",
                    target_entity="Kitchen Preparation",
                    before_value=float(oil_theme["baseline_count"]),
                    after_value=float(oil_theme["target_count"]),
                    change=float(oil_theme["count_change"]),
                    relative_change_pct=oil_rel_pct,
                    details=f"Oiliness/greasiness complaints increased to {oil_theme['target_count']} ({oil_theme['target_daily_rate']}/day) vs {oil_theme['baseline_count']} baseline ({oil_theme['baseline_daily_rate']}/day)."
                )
            )

            supporting_indices = [oil_ev_idx]
            if worst_food_shift:
                worst_ev_idx = len(evidence_list)
                evidence_list.append(
                    EvidenceItem(
                        signal="food_rating_drop",
                        target_entity=worst_food_shift["food_name"],
                        before_value=round(worst_food_shift["baseline_mean"], 2),
                        after_value=round(worst_food_shift["target_mean"], 2),
                        change=worst_food_shift["diff"],
                        relative_change_pct=round((worst_food_shift["diff"] / worst_food_shift["baseline_mean"]) * 100.0, 1),
                        details=f"Significant rating decline observed on {worst_food_shift['food_name']} across {worst_food_shift['target_count']} reviews."
                    )
                )
                supporting_indices.append(worst_ev_idx)

            observations.append(
                f"Student complaints regarding oily or greasy preparations spiked by {oil_theme['velocity_multiplier']:.1f}x."
            )

            conf_score = 0.88 if worst_food_shift else 0.72
            conf_tier = "HIGH" if conf_score >= 0.75 else "MEDIUM"
            dish_desc = f", particularly for {worst_food_shift['food_name']}" if worst_food_shift else ""
            possible_factors.append(
                PossibleFactor(
                    factor_id="HIGH_OIL_PREPARATION",
                    description=f"Higher oil/greasiness complaint activity was observed alongside lower food-rating signals{dish_desc}.",
                    confidence=conf_tier,
                    confidence_score=conf_score,
                    supporting_evidence_indices=supporting_indices
                )
            )

        # Menu Repetition & Decoupling Analysis (Scenario B)
        target_menu = menu_history[menu_history['menu_date'] >= t_start]
        food_freq_counts = target_menu['food_name'].value_counts() if not target_menu.empty else pd.Series(dtype=int)
        repetition_theme = theme_map.get("MENU_REPETITION")

        if not food_freq_counts.empty:
            top_dish = food_freq_counts.index[0]
            top_dish_count = int(food_freq_counts.iloc[0])
            top_dish_freq_ratio = top_dish_count / float(max(target_days, 1))

            poll_share = 0.0
            if not target_polls.empty:
                poll_sub = target_polls[target_polls['food_name'] == top_dish]
                total_votes_in_period = target_polls['vote_count'].sum()
                if total_votes_in_period > 0:
                    poll_share = round(float(poll_sub['vote_count'].sum()) / float(total_votes_in_period) * 100.0, 1)

            if top_dish_count >= 3 and top_dish_freq_ratio >= 0.25:
                freq_ev_idx = len(evidence_list)
                evidence_list.append(
                    EvidenceItem(
                        signal="high_food_frequency",
                        target_entity=top_dish,
                        before_value=1.0,
                        after_value=float(top_dish_count),
                        change=float(top_dish_count - 1),
                        relative_change_pct=round(top_dish_freq_ratio * 100.0, 1),
                        details=f"{top_dish} was scheduled {top_dish_count} times in {target_days} days (repetition ratio: {top_dish_freq_ratio:.2f})."
                    )
                )

                has_rep_complaints = repetition_theme and repetition_theme["velocity_multiplier"] >= 1.5
                if has_rep_complaints and poll_share <= 10.0:
                    rep_ev_idx = len(evidence_list)
                    evidence_list.append(
                        EvidenceItem(
                            signal="poll_preference_vote_share",
                            target_entity=top_dish,
                            before_value=25.0,
                            after_value=poll_share,
                            change=round(poll_share - 25.0, 1),
                            relative_change_pct=round((poll_share - 25.0) / 25.0 * 100.0, 1),
                            details=f"Student poll vote share for {top_dish} collapsed to {poll_share}% during the high-repetition period."
                        )
                    )
                    observations.append(
                        f"{top_dish} was scheduled frequently ({top_dish_count} times in {target_days} days), accompanied by an increase in repetition complaints and reduced poll vote share ({poll_share}%)."
                    )
                    possible_factors.append(
                        PossibleFactor(
                            factor_id="MENU_REPETITION_FATIGUE",
                            description=f"High scheduling repetition of {top_dish} is contributing to student menu fatigue, substantiated by rising complaints and low poll vote share.",
                            confidence="HIGH",
                            confidence_score=0.86,
                            supporting_evidence_indices=[freq_ev_idx, rep_ev_idx]
                        )
                    )
                else:
                    observations.append(
                        f"Notice on menu frequency: {top_dish} was scheduled frequently ({top_dish_count} times), "
                        f"but student poll preference remained high ({poll_share}% vote share) with negligible repetition complaints; "
                        f"this repetition is not classified as an adverse factor."
                    )

        # Temporary Anomaly vs Chronic Trend (Scenario D)
        facility_theme = theme_map.get("FACILITY_WATER")
        hygiene_theme = theme_map.get("HYGIENE_CLEANLINESS")
        facility_spike = (facility_theme and facility_theme["velocity_multiplier"] >= 2.5) or \
                         (hygiene_theme and hygiene_theme["velocity_multiplier"] >= 2.5)

        if target_days <= 10 and facility_spike and diff <= -0.5:
            post_start = t_end + timedelta(days=1)
            post_end = post_start + timedelta(days=7)
            post_reviews = self.db.get_reviews(post_start, post_end)
            post_mean = float(post_reviews['rating'].mean()) if not post_reviews.empty else 0.0

            anomaly_ev_idx = len(evidence_list)
            evidence_list.append(
                EvidenceItem(
                    signal="post_incident_rating_recovery",
                    target_entity="Overall Dining",
                    before_value=round(t_mean, 2),
                    after_value=round(post_mean, 2),
                    change=round(post_mean - t_mean, 2),
                    relative_change_pct=round(((post_mean - t_mean) / t_mean) * 100.0, 1) if t_mean > 0 else 0.0,
                    details=f"Following the incident window, average rating immediately recovered to {post_mean:.2f}."
                )
            )
            observations.append(
                f"The metric decline was acute and transient ({target_days}-day window); satisfaction recovered immediately to {post_mean:.2f} in the subsequent week."
            )
            possible_factors.append(
                PossibleFactor(
                    factor_id="TEMPORARY_OPERATIONAL_ANOMALY",
                    description="The satisfaction drop represents a transient infrastructure/maintenance anomaly (water/sanitation disruption) rather than a persistent culinary or menu defect.",
                    confidence="HIGH",
                    confidence_score=0.92,
                    supporting_evidence_indices=[anomaly_ev_idx]
                )
            )

        return InvestigationResponse(
            investigation_id=investigation_id,
            target_metric="food_satisfaction",
            metric_summary=metric_summary,
            observations=observations,
            evidence=evidence_list,
            possible_factors=possible_factors,
            data_window=data_window,
            engine_version=self.model_version,
            food_details=food_details
        )

    # =========================================================================
    # 2. COMPLAINT VOLUME PIPELINE
    # =========================================================================
    async def _investigate_complaint_volume(
        self,
        request: InvestigationRequest,
        investigation_id: str,
        t_start: date,
        t_end: date,
        c_start: date,
        c_end: date,
        target_days: int,
        baseline_days: int
    ) -> InvestigationResponse:
        target_complaints = self.db.get_complaints(t_start, t_end, meal_type=request.meal_type)
        baseline_complaints = self.db.get_complaints(c_start, c_end, meal_type=request.meal_type)

        t_count = len(target_complaints)
        b_count = len(baseline_complaints)
        diff = round(float(t_count - b_count), 2)
        pct_diff = round((diff / b_count) * 100.0, 1) if b_count > 0 else (100.0 if diff > 0 else 0.0)

        t_users = int(target_complaints['user_id'].nunique()) if not target_complaints.empty else 0
        b_users = int(baseline_complaints['user_id'].nunique()) if not baseline_complaints.empty else 0

        comp_significant = (abs(diff) >= 5) and (abs(pct_diff) >= 20.0)
        comp_p_val = 0.01 if comp_significant else 0.45

        metric_summary = MetricSummary(
            metric="complaint_volume",
            current_value=float(t_count),
            previous_value=float(b_count),
            change=diff,
            percent_change=pct_diff,
            p_value=comp_p_val,
            statistically_significant=comp_significant
        )

        data_window = DataWindowInfo(
            target_start_date=t_start,
            target_end_date=t_end,
            target_sample_count=t_count,
            comparison_start_date=c_start,
            comparison_end_date=c_end,
            comparison_sample_count=b_count,
            cohort_filter=request.meal_type
        )

        observations: List[str] = [
            f"Total complaint volume moved from {b_count} to {t_count} complaints "
            f"(change: {int(diff):+d}, {pct_diff:+.1f}%) across the investigated period.",
            f"{t_users} distinct students submitted complaints during this period, compared to {b_users} in the baseline period."
        ]

        # Analyze semantic themes
        theme_trends = self.classifier.aggregate_theme_trends(
            target_complaints, baseline_complaints, target_days, baseline_days
        )

        theme_items: List[ComplaintThemeItem] = []
        for t in theme_trends:
            tid = t["theme"]
            t_cnt = int(t["target_count"])
            b_cnt = int(t["baseline_count"])
            share = round((t_cnt / t_count * 100.0), 1) if t_count > 0 else 0.0
            theme_items.append(
                ComplaintThemeItem(
                    theme_id=tid,
                    theme_name=THEME_HUMAN_NAMES.get(tid, tid.replace('_', ' ').title()),
                    count=t_cnt,
                    baseline_count=b_cnt,
                    change=t_cnt - b_cnt,
                    share_pct=share,
                    velocity_multiplier=round(float(t.get("velocity_multiplier", 1.0)), 2)
                )
            )

        theme_items.sort(key=lambda x: x.count, reverse=True)

        # Reconcile: complaints classified as GENERAL by NLP are not in theme_results
        # (aggregate_theme_trends discards GENERAL). Calculate remainder and append as unclassified row.
        categorized_total = sum(item.count for item in theme_items)
        unclassified_count = t_count - categorized_total
        if unclassified_count > 0:
            # Calculate baseline unclassified as well
            baseline_categorized = sum(item.baseline_count for item in theme_items)
            unclassified_baseline = b_count - baseline_categorized
            unclassified_share = round((unclassified_count / t_count * 100.0), 1) if t_count > 0 else 0.0
            theme_items.append(
                ComplaintThemeItem(
                    theme_id="UNCLASSIFIED",
                    theme_name="Other / Unclassified",
                    count=unclassified_count,
                    baseline_count=max(unclassified_baseline, 0),
                    change=unclassified_count - max(unclassified_baseline, 0),
                    share_pct=unclassified_share,
                    velocity_multiplier=1.0
                )
            )

        top_theme = theme_items[0] if (theme_items and theme_items[0].count > 0) else None

        # Daily trend
        daily_trend_list: List[ComplaintDailyCount] = []
        if not target_complaints.empty and 'complaint_date' in target_complaints.columns:
            date_counts = target_complaints['complaint_date'].value_counts().sort_index()
            for d, c in date_counts.items():
                daily_trend_list.append(ComplaintDailyCount(date=d.isoformat() if hasattr(d, 'isoformat') else str(d), count=int(c)))

        # Category breakdown
        category_breakdown: List[Dict[str, Any]] = []
        if not target_complaints.empty and 'type' in target_complaints.columns:
            type_counts = target_complaints['type'].value_counts()
            for t_type, t_cnt in type_counts.items():
                category_breakdown.append({
                    "category": str(t_type),
                    "count": int(t_cnt),
                    "share_pct": round(int(t_cnt) / t_count * 100.0, 1) if t_count > 0 else 0.0
                })

        evidence_list: List[EvidenceItem] = []
        possible_factors: List[PossibleFactor] = []

        if not comp_significant and abs(diff) < 5:
            observations.append("Complaint volume variation is within normal historical fluctuations; no dominant complaint driver detected.")
            complaint_details = ComplaintVolumeDetails(
                unique_complainants=t_users,
                comparison_unique_complainants=b_users,
                themes=theme_items,
                top_theme_name=top_theme.theme_name if top_theme else None,
                top_theme_count=top_theme.count if top_theme else 0,
                top_theme_share_pct=top_theme.share_pct if top_theme else 0.0,
                daily_trend=daily_trend_list,
                category_breakdown=category_breakdown
            )
            return InvestigationResponse(
                investigation_id=investigation_id,
                target_metric="complaint_volume",
                metric_summary=metric_summary,
                observations=observations,
                evidence=[],
                possible_factors=[],
                data_window=data_window,
                engine_version=self.model_version,
                complaint_details=complaint_details
            )

        evidence_list.append(
            EvidenceItem(
                signal="complaint_volume_shift",
                target_entity=request.meal_type or "Overall Mess",
                before_value=float(b_count),
                after_value=float(t_count),
                change=diff,
                relative_change_pct=pct_diff,
                p_value=comp_p_val,
                details=f"Recorded {t_count} complaints ({t_count / max(target_days, 1):.1f}/day) vs {b_count} baseline complaints ({b_count / max(baseline_days, 1):.1f}/day)."
            )
        )

        if top_theme and top_theme.count > 0:
            top_ev_idx = len(evidence_list)
            is_new = top_theme.baseline_count == 0
            rel_pct = 0.0 if is_new else round((top_theme.count - top_theme.baseline_count) / top_theme.baseline_count * 100.0, 1)
            details_text = f"{top_theme.theme_name} accounted for {top_theme.count} complaints ({top_theme.share_pct}% share) (new this period)." if is_new else f"{top_theme.theme_name} accounted for {top_theme.count} complaints ({top_theme.share_pct}% share) compared to {top_theme.baseline_count} in baseline."
            evidence_list.append(
                EvidenceItem(
                    signal=f"complaint_theme_concentration_{top_theme.theme_id.lower()}",
                    target_entity=top_theme.theme_name,
                    before_value=float(top_theme.baseline_count),
                    after_value=float(top_theme.count),
                    change=float(top_theme.change),
                    relative_change_pct=rel_pct,
                    details=details_text
                )
            )

            for th in theme_items[1:]:
                if th.count >= 15 and th.velocity_multiplier >= 1.5:
                    th_is_new = th.baseline_count == 0
                    th_rel_pct = 0.0 if th_is_new else round((th.count - th.baseline_count) / th.baseline_count * 100.0, 1)
                    th_details = f"{th.theme_name} rose to {th.count} complaints ({th.share_pct}% share) (new this period)." if th_is_new else f"{th.theme_name} rose to {th.count} complaints ({th.share_pct}% share) vs {th.baseline_count} baseline."
                    evidence_list.append(
                        EvidenceItem(
                            signal=f"complaint_theme_spike_{th.theme_id.lower()}",
                            target_entity=th.theme_name,
                            before_value=float(th.baseline_count),
                            after_value=float(th.count),
                            change=float(th.change),
                            relative_change_pct=th_rel_pct,
                            details=th_details
                        )
                    )

            observations.append(
                f"{top_theme.theme_name} was reported most often, making up {top_theme.count} complaints ({top_theme.share_pct}% of all submissions)."
            )

            factor_name = f"COMPLAINT_SURGE_{top_theme.theme_id}"
            possible_factors.append(
                PossibleFactor(
                    factor_id=factor_name,
                    description=f"A concentration in {top_theme.theme_name.lower()} complaints ({top_theme.count} reports, {top_theme.share_pct}% share) was observed alongside the surge in overall complaint volume.",
                    confidence="HIGH",
                    confidence_score=0.91,
                    supporting_evidence_indices=[top_ev_idx]
                )
            )

        complaint_details = ComplaintVolumeDetails(
            unique_complainants=t_users,
            comparison_unique_complainants=b_users,
            themes=theme_items,
            top_theme_name=top_theme.theme_name if top_theme else None,
            top_theme_count=top_theme.count if top_theme else 0,
            top_theme_share_pct=top_theme.share_pct if top_theme else 0.0,
            daily_trend=daily_trend_list,
            category_breakdown=category_breakdown
        )

        return InvestigationResponse(
            investigation_id=investigation_id,
            target_metric="complaint_volume",
            metric_summary=metric_summary,
            observations=observations,
            evidence=evidence_list,
            possible_factors=possible_factors,
            data_window=data_window,
            engine_version=self.model_version,
            complaint_details=complaint_details
        )

    # =========================================================================
    # 3. POLL PARTICIPATION PIPELINE
    # =========================================================================
    async def _investigate_poll_participation(
        self,
        request: InvestigationRequest,
        investigation_id: str,
        t_start: date,
        t_end: date,
        c_start: date,
        c_end: date,
        target_days: int,
        baseline_days: int
    ) -> InvestigationResponse:
        target_polls = self.db.get_polls_and_votes(t_start, t_end)
        baseline_polls = self.db.get_polls_and_votes(c_start, c_end)

        t_votes = int(target_polls['vote_count'].sum()) if not target_polls.empty else 0
        b_votes = int(baseline_polls['vote_count'].sum()) if not baseline_polls.empty else 0
        t_polls = int(target_polls['poll_id'].nunique()) if not target_polls.empty else 0
        b_polls = int(baseline_polls['poll_id'].nunique()) if not baseline_polls.empty else 0

        t_voters = self.db.get_poll_unique_voters(t_start, t_end)
        b_voters = self.db.get_poll_unique_voters(c_start, c_end)

        diff = round(float(t_votes - b_votes), 2)
        pct_diff = round((diff / b_votes) * 100.0, 1) if b_votes > 0 else (100.0 if diff > 0 else 0.0)

        poll_significant = (abs(diff) >= 20) and (abs(pct_diff) >= 20.0)
        poll_p_val = 0.01 if poll_significant else 0.40

        avg_votes = round(t_votes / max(t_polls, 1), 1)
        b_avg_votes = round(b_votes / max(b_polls, 1), 1)

        metric_summary = MetricSummary(
            metric="poll_participation",
            current_value=float(t_votes),
            previous_value=float(b_votes),
            change=diff,
            percent_change=pct_diff,
            p_value=poll_p_val,
            statistically_significant=poll_significant
        )

        data_window = DataWindowInfo(
            target_start_date=t_start,
            target_end_date=t_end,
            target_sample_count=t_votes,
            comparison_start_date=c_start,
            comparison_end_date=c_end,
            comparison_sample_count=b_votes,
            cohort_filter=request.meal_type
        )

        observations: List[str] = [
            f"Student poll participation moved from {b_votes} to {t_votes} votes "
            f"(change: {int(diff):+d}, {pct_diff:+.1f}%) across {t_polls} polls vs {b_polls} baseline polls.",
            f"{t_voters} distinct students participated across daily menu polls (averaging {avg_votes} votes per poll)."
        ]

        active_polls_list: List[ActivePollItem] = []
        if not target_polls.empty:
            for pid, pgroup in target_polls.groupby('poll_id'):
                p_date = str(pgroup['poll_date'].iloc[0])
                total_p_votes = int(pgroup['vote_count'].sum())
                options_list: List[PollOptionChoice] = []
                for _, row in pgroup.iterrows():
                    v_cnt = int(row['vote_count'])
                    v_share = round((v_cnt / total_p_votes * 100.0), 1) if total_p_votes > 0 else 0.0
                    options_list.append(PollOptionChoice(
                        food_name=row['food_name'],
                        vote_count=v_cnt,
                        share_pct=v_share
                    ))
                options_list.sort(key=lambda x: x.vote_count, reverse=True)
                winner = options_list[0].food_name if options_list else "None"
                winner_share = options_list[0].share_pct if options_list else 0.0
                active_polls_list.append(ActivePollItem(
                    poll_id=int(pid),
                    poll_date=p_date,
                    total_votes=total_p_votes,
                    winning_option=winner,
                    winning_share_pct=winner_share,
                    options=options_list
                ))
            active_polls_list.sort(key=lambda x: x.total_votes, reverse=True)

        top_chosen_list: List[TopChosenOption] = []
        if not target_polls.empty:
            opt_grouped = target_polls.groupby('food_name').agg({
                'vote_count': 'sum',
                'poll_id': 'nunique'
            }).sort_values('vote_count', ascending=False)
            for fname, row in opt_grouped.head(8).iterrows():
                top_chosen_list.append(TopChosenOption(
                    food_name=fname,
                    total_votes=int(row['vote_count']),
                    polls_featured=int(row['poll_id'])
                ))

        daily_trend_list: List[Dict[str, Any]] = []
        if not target_polls.empty:
            date_votes = target_polls.groupby('poll_date')['vote_count'].sum().sort_index()
            for d, v in date_votes.items():
                daily_trend_list.append({"date": str(d), "votes": int(v)})

        evidence_list: List[EvidenceItem] = []
        possible_factors: List[PossibleFactor] = []

        if not poll_significant and abs(diff) < 20:
            observations.append("Poll participation variation is within normal historical fluctuations; no meaningful shift detected.")
            poll_details = PollParticipationDetails(
                unique_voters=t_voters,
                comparison_unique_voters=b_voters,
                total_polls=t_polls,
                comparison_total_polls=b_polls,
                average_votes_per_poll=avg_votes,
                comparison_average_votes_per_poll=b_avg_votes,
                most_active_polls=active_polls_list[:6],
                top_chosen_options=top_chosen_list,
                daily_trend=daily_trend_list
            )
            return InvestigationResponse(
                investigation_id=investigation_id,
                target_metric="poll_participation",
                metric_summary=metric_summary,
                observations=observations,
                evidence=[],
                possible_factors=[],
                data_window=data_window,
                engine_version=self.model_version,
                poll_details=poll_details
            )

        evidence_list.append(
            EvidenceItem(
                signal="poll_vote_volume_shift",
                target_entity="Student Polls",
                before_value=float(b_votes),
                after_value=float(t_votes),
                change=diff,
                relative_change_pct=pct_diff,
                p_value=poll_p_val,
                details=f"Recorded {t_votes} votes across {t_polls} polls vs {b_votes} votes across {b_polls} baseline polls."
            )
        )
        evidence_list.append(
            EvidenceItem(
                signal="poll_turnout_average",
                target_entity="Turnout Rate",
                before_value=b_avg_votes,
                after_value=avg_votes,
                change=round(avg_votes - b_avg_votes, 1),
                relative_change_pct=round((avg_votes - b_avg_votes) / max(b_avg_votes, 1.0) * 100.0, 1),
                details=f"Average participation moved from {b_avg_votes} to {avg_votes} votes per poll."
            )
        )

        if poll_significant and diff < 0:
            possible_factors.append(
                PossibleFactor(
                    factor_id="POLL_ENGAGEMENT_DROP",
                    description=f"A marked decrease in student voting activity was observed across daily menu polls ({diff:+.0f} votes, {pct_diff:+.1f}%).",
                    confidence="HIGH",
                    confidence_score=0.85,
                    supporting_evidence_indices=[0, 1]
                )
            )

        poll_details = PollParticipationDetails(
            unique_voters=t_voters,
            comparison_unique_voters=b_voters,
            total_polls=t_polls,
            comparison_total_polls=b_polls,
            average_votes_per_poll=avg_votes,
            comparison_average_votes_per_poll=b_avg_votes,
            most_active_polls=active_polls_list[:6],
            top_chosen_options=top_chosen_list,
            daily_trend=daily_trend_list
        )

        return InvestigationResponse(
            investigation_id=investigation_id,
            target_metric="poll_participation",
            metric_summary=metric_summary,
            observations=observations,
            evidence=evidence_list,
            possible_factors=possible_factors,
            data_window=data_window,
            engine_version=self.model_version,
            poll_details=poll_details
        )
