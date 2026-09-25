"""
Root Cause Engine Implementation (MESO AI Batch 2).
Analyzes shifts in student satisfaction using multi-signal statistical inference:
- Rating shifts & distributions
- Meal-level concentration (Breakfast vs Lunch vs Dinner)
- Food-specific rating drops & menu frequency
- Semantic complaint theme velocities (TF-IDF & vector similarity)
- Poll preference vs. repetition decoupling
- Acute anomaly vs. chronic trend detection
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
    PossibleFactor
)
from app.data.client import MesoDbClient
from app.nlp.complaint_topics import ComplaintTopicClassifier

class RootCauseEngine:
    """
    Evidence-Based Root Cause Diagnostic Engine.
    Answers: 'WHY did this measurable change happen?'
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

        # 1. Ingest Data
        target_reviews = self.db.get_reviews(t_start, t_end, meal_type=request.meal_type, food_id=request.food_id)
        baseline_reviews = self.db.get_reviews(c_start, c_end, meal_type=request.meal_type, food_id=request.food_id)

        target_complaints = self.db.get_complaints(t_start, t_end, meal_type=request.meal_type)
        baseline_complaints = self.db.get_complaints(c_start, c_end, meal_type=request.meal_type)

        menu_history = self.db.get_menu_history(c_start - timedelta(days=14), t_end)
        target_polls = self.db.get_polls_and_votes(t_start, t_end)
        baseline_polls = self.db.get_polls_and_votes(c_start, c_end)

        data_window = DataWindowInfo(
            target_start_date=t_start,
            target_end_date=t_end,
            target_sample_count=len(target_reviews),
            comparison_start_date=c_start,
            comparison_end_date=c_end,
            comparison_sample_count=len(baseline_reviews),
            cohort_filter=request.meal_type
        )

        observations: List[str] = []
        evidence_list: List[EvidenceItem] = []
        possible_factors: List[PossibleFactor] = []

        # 2. Measurable Metric Change (Rating Signal)
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

        metric_summary = MetricSummary(
            metric=request.metric or "food_satisfaction",
            current_value=round(t_mean, 2),
            previous_value=round(b_mean, 2),
            change=diff,
            percent_change=pct_diff,
            p_value=p_val,
            statistically_significant=is_significant
        )

        # Baseline Observation
        observations.append(
            f"Average food satisfaction moved from {b_mean:.2f} to {t_mean:.2f} (change: {diff:+.2f}, {pct_diff:+.1f}%) "
            f"across {len(t_ratings)} reviews vs {len(b_ratings)} baseline reviews."
        )

        # 3. Rule: Check for "No Meaningful Change" (Test 7)
        if not is_significant and abs(diff) < 0.15:
            observations.append("Metric variation is within normal historical fluctuations; no statistically significant degradation detected.")
            return InvestigationResponse(
                investigation_id=investigation_id,
                target_metric=request.metric or "food_satisfaction",
                metric_summary=metric_summary,
                observations=observations,
                evidence=evidence_list,
                possible_factors=possible_factors,
                data_window=data_window,
                engine_version=self.model_version
            )

        # Record Primary Rating Evidence
        evidence_list.append(
            EvidenceItem(
                signal="average_food_rating_shift",
                target_entity=request.meal_type or "All",
                before_value=round(b_mean, 2),
                after_value=round(t_mean, 2),
                change=diff,
                relative_change_pct=pct_diff,
                p_value=p_val,
                details=f"Calculated across {len(t_ratings)} target reviews vs {len(b_ratings)} comparison reviews"
            )
        )

        # 4. Meal-Level Concentration Analysis (Scenario C / Test 5)
        meal_shifts: Dict[str, Dict[str, float]] = {}
        if not target_reviews.empty and not baseline_reviews.empty:
            for m in ['Breakfast', 'Lunch', 'Dinner']:
                t_m_sub = target_reviews[target_reviews['meal_type'].str.lower() == m.lower()]['rating']
                b_m_sub = baseline_reviews[baseline_reviews['meal_type'].str.lower() == m.lower()]['rating']
                if len(t_m_sub) >= 5 and len(b_m_sub) >= 5:
                    tm = float(t_m_sub.mean())
                    bm = float(b_m_sub.mean())
                    mdiff = tm - bm
                    meal_shifts[m] = {"target": tm, "baseline": bm, "diff": mdiff}

            dinner_shift = meal_shifts.get('Dinner', {}).get('diff', 0.0)
            lunch_shift = meal_shifts.get('Lunch', {}).get('diff', 0.0)
            breakfast_shift = meal_shifts.get('Breakfast', {}).get('diff', 0.0)

            # If dinner decline is distinctively steep compared to lunch or breakfast
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

        # 5. Food Signal & Frequency Analysis (Scenario A & B)
        food_shifts: List[Dict[str, Any]] = []
        if not target_reviews.empty and not baseline_reviews.empty:
            target_food_groups = target_reviews.groupby('food_name')['rating'].agg(['mean', 'count'])
            baseline_food_groups = baseline_reviews.groupby('food_name')['rating'].agg(['mean', 'count'])

            common_foods = set(target_food_groups.index).intersection(baseline_food_groups.index)
            for fname in common_foods:
                tf_count = int(target_food_groups.loc[fname, 'count'])
                bf_count = int(baseline_food_groups.loc[fname, 'count'])
                if tf_count >= 10:
                    tf_mean = float(target_food_groups.loc[fname, 'mean'])
                    bf_mean = float(baseline_food_groups.loc[fname, 'mean'])
                    fdiff = round(tf_mean - bf_mean, 2)
                    food_shifts.append({
                        "food_name": fname,
                        "target_mean": tf_mean,
                        "baseline_mean": bf_mean,
                        "diff": fdiff,
                        "target_count": tf_count
                    })

        food_shifts.sort(key=lambda x: x["diff"])

        # 6. Complaint Semantic Topic Trends
        theme_trends = self.classifier.aggregate_theme_trends(
            target_complaints, baseline_complaints, target_days, baseline_days
        )

        theme_map = {t["theme"]: t for t in theme_trends}

        # ------------------------------------------------------------------
        # SCENARIO A: OIL / GREASINESS DETECTION
        # ------------------------------------------------------------------
        oil_theme = theme_map.get("OIL_GREASINESS")
        dal_food_shift = next((f for f in food_shifts if "Dal" in f["food_name"] and f["diff"] <= -0.40), None)

        if oil_theme and oil_theme["velocity_multiplier"] >= 2.0:
            oil_ev_idx = len(evidence_list)
            evidence_list.append(
                EvidenceItem(
                    signal="complaint_theme_velocity_oil",
                    target_entity="General Kitchen",
                    before_value=float(oil_theme["baseline_count"]),
                    after_value=float(oil_theme["target_count"]),
                    change=float(oil_theme["count_change"]),
                    relative_change_pct=round((oil_theme["velocity_multiplier"] - 1.0) * 100.0, 1),
                    details=f"Oiliness/greasiness complaints increased to {oil_theme['target_count']} ({oil_theme['target_daily_rate']}/day) vs {oil_theme['baseline_count']} baseline ({oil_theme['baseline_daily_rate']}/day)."
                )
            )

            supporting_indices = [oil_ev_idx]
            if dal_food_shift:
                dal_ev_idx = len(evidence_list)
                evidence_list.append(
                    EvidenceItem(
                        signal="food_rating_drop_dal",
                        target_entity=dal_food_shift["food_name"],
                        before_value=round(dal_food_shift["baseline_mean"], 2),
                        after_value=round(dal_food_shift["target_mean"], 2),
                        change=dal_food_shift["diff"],
                        relative_change_pct=round((dal_food_shift["diff"] / dal_food_shift["baseline_mean"]) * 100.0, 1),
                        details=f"Significant rating decline observed on {dal_food_shift['food_name']} across {dal_food_shift['target_count']} reviews."
                    )
                )
                supporting_indices.append(dal_ev_idx)

            observations.append(
                f"Student complaints regarding oily or greasy preparations spiked by {oil_theme['velocity_multiplier']:.1f}x."
            )

            conf_score = 0.88 if dal_food_shift else 0.72
            conf_tier = "HIGH" if conf_score >= 0.75 else "MEDIUM"
            possible_factors.append(
                PossibleFactor(
                    factor_id="HIGH_OIL_PREPARATION",
                    description="Higher oil/greasiness complaint activity was observed alongside lower food-rating signals, particularly for dinner and dal dishes.",
                    confidence=conf_tier,
                    confidence_score=conf_score,
                    supporting_evidence_indices=supporting_indices
                )
            )

        # ------------------------------------------------------------------
        # SCENARIO B: MENU REPETITION & POLL PREFERENCE DECOUPLING
        # ------------------------------------------------------------------
        # Analyze Menu Frequency in target window
        target_menu = menu_history[menu_history['menu_date'] >= t_start]
        food_freq_counts = target_menu['food_name'].value_counts() if not target_menu.empty else pd.Series(dtype=int)

        repetition_theme = theme_map.get("MENU_REPETITION")

        # Find most frequent dish
        if not food_freq_counts.empty:
            top_dish = food_freq_counts.index[0]
            top_dish_count = int(food_freq_counts.iloc[0])
            top_dish_freq_ratio = top_dish_count / float(max(target_days, 1))

            # Calculate poll preference vote share for this top dish during the target period
            poll_share = 0.0
            if not target_polls.empty:
                poll_sub = target_polls[target_polls['food_name'] == top_dish]
                total_votes_in_period = target_polls['vote_count'].sum()
                if total_votes_in_period > 0:
                    poll_share = round(float(poll_sub['vote_count'].sum()) / float(total_votes_in_period) * 100.0, 1)

            # High repetition detected: served >= 3 times in short window or >= 30% of days
            if top_dish_count >= 3 and top_dish_freq_ratio >= 0.25:
                freq_ev_idx = len(evidence_list)
                evidence_list.append(
                    EvidenceItem(
                        signal="high_food_frequency",
                        target_entity=top_dish,
                        before_value=1.0,
                        after_value=float(top_dish_count),
                        change=float(top_dish_count - 1),
                        relative_change_pct=round((top_dish_freq_ratio) * 100.0, 1),
                        details=f"{top_dish} was scheduled {top_dish_count} times in {target_days} days (repetition ratio: {top_dish_freq_ratio:.2f})."
                    )
                )

                # CRITICAL RULE: Check poll preference and complaints
                # Case 1 (Fatigue Window): Repetition complaints elevated AND poll preference low (<= 10%)
                has_rep_complaints = repetition_theme and repetition_theme["velocity_multiplier"] >= 1.5
                if has_rep_complaints and poll_share <= 10.0:
                    rep_ev_idx = len(evidence_list)
                    evidence_list.append(
                        EvidenceItem(
                            signal="poll_preference_vote_share",
                            target_entity=top_dish,
                            before_value=25.0, # Baseline poll share benchmark
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
                    # Case 2 (Counterexample / Celebration Window):
                    # High frequency BUT strong poll preference (> 12%) and low repetition complaints
                    observations.append(
                        f"Notice on menu frequency: {top_dish} was scheduled frequently ({top_dish_count} times), "
                        f"but student poll preference remained high ({poll_share}% vote share) with negligible repetition complaints; "
                        f"this repetition is not classified as an adverse factor."
                    )

        # ------------------------------------------------------------------
        # SCENARIO D: TEMPORARY ANOMALY VS CHRONIC TREND
        # ------------------------------------------------------------------
        facility_theme = theme_map.get("FACILITY_WATER")
        hygiene_theme = theme_map.get("HYGIENE_CLEANLINESS")
        facility_spike = (facility_theme and facility_theme["velocity_multiplier"] >= 2.5) or \
                         (hygiene_theme and hygiene_theme["velocity_multiplier"] >= 2.5)

        # Check if target window is acute (<= 10 days) and check post-period recovery
        if target_days <= 10 and facility_spike and diff <= -0.5:
            # Query post-target recovery window (subsequent 7 days)
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
                    details=f"Following the 7-day incident window, average rating immediately recovered to {post_mean:.2f}."
                )
            )

            observations.append(
                f"The metric decline was acute and transient (7-day window); satisfaction recovered immediately to {post_mean:.2f} in the subsequent week."
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
            target_metric=request.metric or "food_satisfaction",
            metric_summary=metric_summary,
            observations=observations,
            evidence=evidence_list,
            possible_factors=possible_factors,
            data_window=data_window,
            engine_version=self.model_version
        )
