"""
Simulation Engine Implementation (MESO AI Batch 4 & Hardening).
Answers: 'WHAT IF WE CHANGE SOMETHING?'

Core Flow:
Admin Scenario -> Scenario Validation -> Virtual Scenario State -> Feature Transformation
               -> Forecast Model -> Monte Carlo Uncertainty Simulation (Paired Common-Shock)
               -> Outcome Distribution (P10/P50/P90) -> Baseline vs Scenario

HARD SAFETY RULE:
Simulation is strictly read-only against operational database tables.
Zero mutation of daily_menu, foods, food_reviews, complaints, or food_polls.
"""

import uuid
import logging
from datetime import datetime, date, timedelta, timezone
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

from app.data.schemas import (
    SimulationRequest,
    SimulationResponse,
    ScenarioComparisonPoint,
    MonteCarloDistribution,
    SimulationDelta,
    SimulatedOutcome,
    ScenarioMeal
)
from app.engines.forecast import ForecastEngine

# =============================================================================
# 1. PURE FEATURE TRANSFORMATION FUNCTION (NO DATABASE MUTATION)
# =============================================================================
def apply_scenario(base_features: Dict[str, float], scenario: Dict[str, Any]) -> Dict[str, float]:
    """
    Pure function that transforms a baseline feature dictionary into a hypothetical
    scenario feature dictionary in-memory.
    Never executes database queries or updates.
    """
    transformed = base_features.copy()

    # Repetition adjustments (spacing / frequency)
    if "days_since_last_served" in scenario:
        transformed["days_since_last_served"] = float(scenario["days_since_last_served"])
    elif "repetition_delta_days" in scenario:
        transformed["days_since_last_served"] = max(1.0, transformed.get("days_since_last_served", 7.0) + float(scenario["repetition_delta_days"]))

    if "food_frequency_7d" in scenario:
        transformed["food_frequency_7d"] = float(scenario["food_frequency_7d"])
    elif "repetition_delta_frequency" in scenario:
        transformed["food_frequency_7d"] = max(0.0, transformed.get("food_frequency_7d", 1.0) + float(scenario["repetition_delta_frequency"]))

    if "food_frequency_14d" in scenario:
        transformed["food_frequency_14d"] = float(scenario["food_frequency_14d"])
    if "food_frequency_30d" in scenario:
        transformed["food_frequency_30d"] = float(scenario["food_frequency_30d"])

    # Preference shift (isolated from repetition)
    if "poll_vote_share_recent" in scenario:
        transformed["poll_vote_share_recent"] = float(np.clip(scenario["poll_vote_share_recent"], 0.0, 100.0))
    elif "poll_vote_share_shift" in scenario:
        transformed["poll_vote_share_recent"] = float(np.clip(transformed.get("poll_vote_share_recent", 25.0) + float(scenario["poll_vote_share_shift"]), 0.0, 100.0))

    # Complaint adjustments
    if "total_complaints_7d" in scenario:
        transformed["total_complaints_7d"] = float(scenario["total_complaints_7d"])
    if "oil_complaints_7d" in scenario:
        transformed["oil_complaints_7d"] = float(scenario["oil_complaints_7d"])
    if "dish_complaint_rate_14d" in scenario:
        transformed["dish_complaint_rate_14d"] = float(scenario["dish_complaint_rate_14d"])

    return transformed


class SimulationEngine:
    """
    Monte Carlo 'WHAT IF?' Simulation Engine.
    Executes advisory counterfactual scenarios without altering operational tables.
    """

    def __init__(
        self,
        forecast_engine: Optional[ForecastEngine] = None,
        model_version: str = "sim-engine-v1.0-mc"
    ):
        self.forecast_engine = forecast_engine or ForecastEngine()
        self.db = self.forecast_engine.db
        self.model_version = model_version

    # =========================================================================
    # 2. SCENARIO VALIDATION (DATABASE-BACKED CATALOG & BOUND CHECKS)
    # =========================================================================
    def validate_request(self, request: SimulationRequest) -> Tuple[str, str, str, date, str]:
        """
        Validates scenario parameters against MESO database catalog and bounds.
        Raises ValueError with clear message if parameters are invalid.
        Returns: (scenario_type, baseline_food, scenario_food, target_date, meal_type)
        """
        target_date = request.simulation_date or (date.today() + timedelta(days=1))

        # 1. Meal type validation
        raw_meal = (request.meal_type or "Dinner").strip().capitalize()
        if raw_meal.lower() not in ["breakfast", "lunch", "dinner"]:
            raise ValueError(f"Invalid meal_type '{request.meal_type}'. Supported meal types are Breakfast, Lunch, Dinner.")
        meal_type = raw_meal

        # 2. Scenario type validation
        scenario_type = request.scenario_type or "FOOD_REPLACEMENT"
        valid_scenarios = ["FOOD_REPLACEMENT", "REPETITION_CHANGE", "MEAL_COMBINATION"]
        if scenario_type not in valid_scenarios:
            raise ValueError(f"Invalid scenario_type '{scenario_type}'. Supported types: {', '.join(valid_scenarios)}.")

        # 3. Runs validation
        runs = request.runs if request.runs else (request.monte_carlo_runs or 1000)
        if runs < 10 or runs > 10000:
            raise ValueError(f"Monte Carlo runs must be between 10 and 10,000. Provided: {runs}.")

        # 4. Repetition delta days validation
        if request.repetition_delta_days is not None:
            if request.repetition_delta_days < -30 or request.repetition_delta_days > 30:
                raise ValueError("repetition_delta_days must be between -30 and +30 days.")

        # 5. Multi-dish combination check
        if scenario_type == "MEAL_COMBINATION" or (request.baseline_meal and request.scenario_meal):
            scenario_type = "MEAL_COMBINATION"
            if not request.baseline_meal or not request.baseline_meal.items:
                raise ValueError("MEAL_COMBINATION scenario requires a baseline_meal with at least one item.")
            if not request.scenario_meal or not request.scenario_meal.items:
                raise ValueError("MEAL_COMBINATION scenario requires a scenario_meal with at least one item.")

            # Validate each constituent food against MESO catalog
            for item in request.baseline_meal.items:
                if not self.db.food_exists(item):
                    raise ValueError(f"Baseline meal item '{item}' not found in MESO food catalog.")
            for item in request.scenario_meal.items:
                if not self.db.food_exists(item):
                    raise ValueError(f"Scenario meal item '{item}' not found in MESO food catalog.")

            baseline_food = " + ".join(request.baseline_meal.items)
            scenario_food = " + ".join(request.scenario_meal.items)
            return scenario_type, baseline_food, scenario_food, target_date, meal_type

        # 6. Single food entity validation
        baseline_food = request.baseline_food or "Rajma"
        scenario_food = request.scenario_food or "Chole Bhature"

        if not self.db.food_exists(baseline_food):
            raise ValueError(f"Baseline food '{baseline_food}' does not exist in MESO food catalog.")

        if scenario_type == "REPETITION_CHANGE":
            scenario_food = baseline_food
        else:
            if not self.db.food_exists(scenario_food):
                raise ValueError(f"Scenario food '{scenario_food}' does not exist in MESO food catalog.")

        return scenario_type, baseline_food, scenario_food, target_date, meal_type

    # =========================================================================
    # 3. CORE SIMULATION DISPATCHER
    # =========================================================================
    async def simulate(self, request: SimulationRequest) -> SimulationResponse:
        sim_id = f"sim-{uuid.uuid4().hex[:8]}"
        scenario_type, base_food_name, scen_food_name, target_date, meal_type = self.validate_request(request)
        num_runs = request.runs if request.runs else (request.monte_carlo_runs or 1000)

        assumptions: List[str] = [
            "This simulation is advisory and does not modify the live operational menu.",
            f"Evaluated {num_runs} paired counterfactual draws using empirical model residual variance.",
            "Predictions are model estimates under the stated assumptions, not causal guarantees."
        ]
        tradeoffs: List[str] = []

        # ---------------------------------------------------------------------
        # SCENARIO 1: FOOD REPLACEMENT (e.g. Rajma -> Chole Bhature)
        # ---------------------------------------------------------------------
        if scenario_type == "FOOD_REPLACEMENT":
            # 1. Baseline prediction
            base_feats, base_status, base_count = self.forecast_engine.build_features_for_food(base_food_name, target_date, meal_type)
            base_pred, _ = self.forecast_engine.predict_ml(base_feats)
            base_sigma = 0.65 if base_status in ["INSUFFICIENT_DATA", "NO_HISTORY"] else self.forecast_engine._residual_std

            # 2. Scenario prediction (hypothetical substitution)
            scen_feats, scen_status, scen_count = self.forecast_engine.build_features_for_food(scen_food_name, target_date, meal_type)
            scen_pred, _ = self.forecast_engine.predict_ml(scen_feats)
            scen_sigma = 0.65 if scen_status in ["INSUFFICIENT_DATA", "NO_HISTORY"] else self.forecast_engine._residual_std

            confidence = "HIGH"
            if base_status in ["INSUFFICIENT_DATA", "NO_HISTORY"] or scen_status in ["INSUFFICIENT_DATA", "NO_HISTORY"]:
                confidence = "LOW"
                assumptions.append("Low historical telemetry detected for one or more candidate dishes; uncertainty widened.")
            elif base_count < 15 or scen_count < 15:
                confidence = "MEDIUM"

            if scen_pred >= base_pred:
                tradeoffs.append(f"Under the stated model assumptions, substituting '{base_food_name}' with '{scen_food_name}' produces a projected rating difference of +{scen_pred - base_pred:.2f} stars.")
            else:
                tradeoffs.append(f"Under the stated model assumptions, substituting '{base_food_name}' with '{scen_food_name}' produces a projected rating difference of {scen_pred - base_pred:.2f} stars.")

        # ---------------------------------------------------------------------
        # SCENARIO 2: MENU REPETITION ADJUSTMENT (e.g. spacing Paneer)
        # ---------------------------------------------------------------------
        elif scenario_type == "REPETITION_CHANGE":
            base_feats, base_status, base_count = self.forecast_engine.build_features_for_food(base_food_name, target_date, meal_type)
            base_pred, _ = self.forecast_engine.predict_ml(base_feats)
            base_sigma = self.forecast_engine._residual_std

            delta_days = request.repetition_delta_days if request.repetition_delta_days is not None else 3
            scenario_mod = {
                "days_since_last_served": base_feats.get("days_since_last_served", 2.0) + delta_days,
                "food_frequency_7d": max(0.0, base_feats.get("food_frequency_7d", 2.0) - 1.0)
            }
            scen_feats = apply_scenario(base_feats, scenario_mod)
            scen_pred, _ = self.forecast_engine.predict_ml(scen_feats)
            scen_sigma = self.forecast_engine._residual_std
            confidence = "HIGH" if base_count >= 15 else "MEDIUM"

            tradeoffs.append(f"Historical observations associate increased spacing (+{delta_days} days) for '{base_food_name}' with lower repetition fatigue.")
            assumptions.append(f"Assumed repetition spacing changed from {base_feats.get('days_since_last_served', 2.0):.0f} to {scen_feats['days_since_last_served']:.0f} days.")

        # ---------------------------------------------------------------------
        # SCENARIO 3: MEAL COMBINATION (e.g. Poori + Chana vs Poori + Aloo Gobi)
        # ---------------------------------------------------------------------
        elif scenario_type == "MEAL_COMBINATION":
            base_items = request.baseline_meal.items if request.baseline_meal else ["Poori", "Chana"]
            scen_items = request.scenario_meal.items if request.scenario_meal else ["Poori", "Aloo Gobi"]

            base_preds = []
            for item in base_items:
                f, _, _ = self.forecast_engine.build_features_for_food(item, target_date, meal_type)
                p, _ = self.forecast_engine.predict_ml(f)
                base_preds.append(p)
            base_pred = float(np.mean(base_preds))
            base_sigma = 0.45

            scen_preds = []
            for item in scen_items:
                f, _, _ = self.forecast_engine.build_features_for_food(item, target_date, meal_type)
                p, _ = self.forecast_engine.predict_ml(f)
                scen_preds.append(p)
            scen_pred = float(np.mean(scen_preds))
            scen_sigma = 0.45

            confidence = "LOW"
            assumptions.append("Multi-dish combination uses composite dish ensemble. Telemetry does not isolate causal dish-pair interaction terms.")
            tradeoffs.append(f"Model estimates composite satisfaction for [{', '.join(base_items)}] vs [{', '.join(scen_items)}].")

        else:
            raise ValueError(f"Unsupported scenario type: {scenario_type}")

        # ---------------------------------------------------------------------
        # 4. PAIRED COUNTERFACTUAL MONTE CARLO UNCERTAINTY SAMPLING
        # ---------------------------------------------------------------------
        # In a paired counterfactual scenario on a specific mess day, common environmental
        # conditions (e.g. campus attendance, mess staff consistency) represent shared variance.
        # We model this via a shared common-shock term plus dish-specific residual error.
        np.random.seed(42)  # Deterministic seed for reproducible evaluation
        shared_sigma = 0.22
        shared_shocks = np.random.normal(0.0, shared_sigma, num_runs)

        base_indep_sigma = float(np.sqrt(max(0.01, base_sigma**2 - shared_sigma**2)))
        scen_indep_sigma = float(np.sqrt(max(0.01, scen_sigma**2 - shared_sigma**2)))

        base_samples = np.clip(np.random.normal(base_pred, base_indep_sigma, num_runs) + shared_shocks, 1.0, 5.0)
        scen_samples = np.clip(np.random.normal(scen_pred, scen_indep_sigma, num_runs) + shared_shocks, 1.0, 5.0)

        delta_samples = scen_samples - base_samples

        # Calculate Distribution Statistics for Scenario
        scen_mean = float(round(float(np.mean(scen_samples)), 2))
        scen_std = float(round(float(np.std(scen_samples)), 3))
        p10 = float(round(float(np.percentile(scen_samples, 10)), 2))
        p25 = float(round(float(np.percentile(scen_samples, 25)), 2))
        p50 = float(round(float(np.percentile(scen_samples, 50)), 2))
        p75 = float(round(float(np.percentile(scen_samples, 75)), 2))
        p90 = float(round(float(np.percentile(scen_samples, 90)), 2))

        prob_improvement = float(round(float(np.mean(delta_samples > 0)), 3))
        prob_drop = float(round(float(np.mean(delta_samples < 0)), 3))

        # Baseline percentiles
        base_lower = float(round(float(np.percentile(base_samples, 5)), 2))
        base_upper = float(round(float(np.percentile(base_samples, 95)), 2))
        base_p10 = float(round(float(np.percentile(base_samples, 10)), 2))
        base_p50 = float(round(float(np.median(base_samples)), 2))
        base_p90 = float(round(float(np.percentile(base_samples, 90)), 2))

        scen_lower = float(round(float(np.percentile(scen_samples, 5)), 2))
        scen_upper = float(round(float(np.percentile(scen_samples, 95)), 2))

        # True empirical delta distribution percentiles (NOT flat constant differences)
        mean_delta = float(round(float(np.mean(delta_samples)), 2))
        p10_delta = float(round(float(np.percentile(delta_samples, 10)), 2))
        p50_delta = float(round(float(np.percentile(delta_samples, 50)), 2))
        p90_delta = float(round(float(np.percentile(delta_samples, 90)), 2))
        direction = "POSITIVE" if mean_delta > 0.05 else ("NEGATIVE" if mean_delta < -0.05 else "NEUTRAL")

        # Package Outcome Objects
        baseline_point = ScenarioComparisonPoint(
            prediction=round(base_pred, 2),
            lower_bound=base_lower,
            upper_bound=base_upper,
            confidence=confidence,
            p10=base_p10,
            p50=base_p50,
            p90=base_p90,
            std=round(base_sigma, 3)
        )

        scenario_point = ScenarioComparisonPoint(
            prediction=round(scen_pred, 2),
            lower_bound=scen_lower,
            upper_bound=scen_upper,
            confidence=confidence,
            p10=p10,
            p50=p50,
            p90=p90,
            std=scen_std
        )

        delta_obj = SimulationDelta(
            mean_delta=mean_delta,
            p10_delta=p10_delta,
            p50_delta=p50_delta,
            p90_delta=p90_delta,
            direction=direction
        )

        dist_obj = MonteCarloDistribution(
            runs=num_runs,
            mean=scen_mean,
            std=scen_std,
            p10=p10,
            p25=p25,
            p50=p50,
            p75=p75,
            p90=p90,
            probability_of_improvement=prob_improvement,
            probability_of_rating_drop=prob_drop
        )

        outcomes = [
            SimulatedOutcome(
                metric="food_satisfaction_rating",
                projected_mean=scen_mean,
                projected_min=scen_lower,
                projected_max=scen_upper,
                probability_of_rating_drop=prob_drop,
                risk_level="HIGH" if prob_drop > 0.40 else ("MODERATE" if prob_drop > 0.20 else "LOW")
            )
        ]

        response = SimulationResponse(
            simulation_id=sim_id,
            simulation_name=request.simulation_name or f"What-If: {base_food_name} vs {scen_food_name}",
            scenario_type=scenario_type,
            simulation_date=target_date,
            meal_type=meal_type,
            baseline=baseline_point,
            scenario=scenario_point,
            delta=delta_obj,
            distribution=dist_obj,
            confidence=confidence,
            model_version=self.model_version,
            assumptions=assumptions,
            key_tradeoffs=tradeoffs,
            outcomes=outcomes,
            computed_at=datetime.now(timezone.utc)
        )

        # ---------------------------------------------------------------------
        # 5. PERSIST SIMULATION METADATA (NON-MUTATING AUDIT LOG)
        # ---------------------------------------------------------------------
        try:
            self.db.persist_simulation({
                "simulation_id": sim_id,
                "simulation_name": response.simulation_name,
                "scenario_type": scenario_type,
                "input_schedule": {
                    "baseline_food": base_food_name,
                    "scenario_food": scen_food_name,
                    "simulation_date": target_date.isoformat(),
                    "meal_type": meal_type,
                    "runs": num_runs
                },
                "projected_outcomes": {
                    "baseline": baseline_point.model_dump(),
                    "scenario": scenario_point.model_dump(),
                    "delta": delta_obj.model_dump(),
                    "distribution": dist_obj.model_dump()
                },
                "risk_level": outcomes[0].risk_level if outcomes else "LOW",
                "key_tradeoffs": tradeoffs,
                "model_version": self.model_version
            })
            response.audit_persistence_status = "PERSISTED"
        except Exception as e:
            # Production-safe logging: log error type without exposing database credentials, query strings, or stack traces
            logger.error(
                "Simulation audit persistence failed for simulation_id=%s. Cause: %s",
                sim_id,
                type(e).__name__
            )
            response.audit_persistence_status = "FAILED"
            response.audit_warning = "Simulation completed successfully, but audit history could not be persisted to the database."

        return response

