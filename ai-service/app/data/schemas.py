"""
Pydantic contracts and data transfer schemas for MESO AI microservice.
Conforms to the 4-tier explainability protocol:
- OBSERVATION
- EVIDENCE
- POSSIBLE FACTORS
- CONFIDENCE
"""

from typing import List, Optional, Dict, Any, Union
from datetime import date, datetime, timezone
from pydantic import BaseModel, Field, model_validator

# ==========================================
# EXPLAINABILITY BUILDING BLOCKS
# ==========================================

class DataWindowInfo(BaseModel):
    target_start_date: date
    target_end_date: date
    target_sample_count: int = Field(default=0, description="Records analyzed in target window")
    comparison_start_date: Optional[date] = None
    comparison_end_date: Optional[date] = None
    comparison_sample_count: int = Field(default=0, description="Records analyzed in comparison baseline window")
    cohort_filter: Optional[str] = None

class EvidenceItem(BaseModel):
    signal: str = Field(..., description="Name of empirical metric (e.g. food_frequency_7d, complaint_count_oil)")
    target_entity: Optional[str] = Field(None, description="Food name or meal type if applicable")
    before_value: float = Field(..., description="Value measured during comparison baseline window")
    after_value: float = Field(..., description="Value measured during target problem window")
    change: float = Field(..., description="Absolute change (after - before)")
    relative_change_pct: float = Field(default=0.0, description="Percentage change ((after - before) / before * 100)")
    p_value: Optional[float] = Field(None, description="Statistical significance p-value if applicable")
    details: Optional[str] = None

class PossibleFactor(BaseModel):
    factor_id: str = Field(..., description="Machine-readable factor code (e.g. HIGH_OIL_PREPARATION, MENU_REPETITION_FATIGUE)")
    description: str = Field(..., description="Human-readable explanation of why this factor was identified")
    confidence: str = Field(..., description="Explicit confidence tier: LOW, MEDIUM, HIGH")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Calibrated numerical score between 0.0 and 1.0")
    supporting_evidence_indices: List[int] = Field(
        default_factory=list,
        description="Zero-indexed references into the parent evidence list supporting this factor"
    )

class MetricSummary(BaseModel):
    metric: str
    current_value: float
    previous_value: float
    change: float
    percent_change: float
    p_value: Optional[float] = None
    statistically_significant: bool = False

# ==========================================
# 1. ROOT CAUSE ENGINE SCHEMAS
# ==========================================

class InvestigationRequest(BaseModel):
    metric: Optional[str] = Field(default="food_satisfaction", description="Target metric to investigate")
    target_metric: Optional[str] = Field(default=None, description="Alias for metric")
    start_date: date
    end_date: date
    comparison_start_date: Optional[date] = Field(default=None, description="Baseline start date")
    comparison_end_date: Optional[date] = Field(default=None, description="Baseline end date")
    meal_type: Optional[str] = Field(default=None, description="Optional meal filter: Breakfast, Lunch, Dinner")
    food_id: Optional[int] = Field(default=None, description="Optional specific food ID to investigate")
    food_name: Optional[str] = Field(default=None, description="Optional specific food name to investigate")

    @model_validator(mode='before')
    @classmethod
    def reconcile_metric_names(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if 'target_metric' in values and values['target_metric'] and not values.get('metric'):
                values['metric'] = values['target_metric']
            elif 'metric' in values and values['metric'] and not values.get('target_metric'):
                values['target_metric'] = values['metric']
        return values

class InvestigationResponse(BaseModel):
    investigation_id: str
    target_metric: str
    metric_summary: MetricSummary
    observations: List[str] = Field(..., description="Direct factual shifts observed in metrics")
    evidence: List[EvidenceItem] = Field(..., description="Traceable empirical evidence supporting findings")
    possible_factors: List[PossibleFactor] = Field(..., description="Ranked candidate contributing factors")
    data_window: DataWindowInfo
    engine_version: str = "rc-engine-v2.0-statistical"
    computed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==========================================
# 2. FORECAST ENGINE SCHEMAS
# ==========================================

class ForecastRequest(BaseModel):
    target: Optional[str] = Field(default="food_rating", description="Prediction target: food_rating, complaint_volume, poll_participation")
    forecast_date: Optional[date] = Field(default=None, description="Specific target date to forecast (defaults to tomorrow)")
    food: Optional[str] = Field(default=None, description="Food name alias")
    food_name: Optional[str] = Field(default=None, description="Food name")
    food_id: Optional[int] = Field(default=None, description="Food ID")
    meal_type: Optional[str] = Field(default="Dinner", description="Meal type")
    horizon_days: int = Field(default=7, ge=1, le=30, description="Forecast horizon in days")
    metrics: List[str] = Field(
        default_factory=lambda: ["food_rating"],
        description="Metrics to forecast"
    )

    @model_validator(mode='before')
    @classmethod
    def reconcile_names(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if 'food' in values and values['food'] and not values.get('food_name'):
                values['food_name'] = values['food']
            elif 'food_name' in values and values['food_name'] and not values.get('food'):
                values['food'] = values['food_name']
        return values

class ForecastDataPoint(BaseModel):
    forecast_date: date
    metric: str
    target_entity: Optional[str] = None
    predicted_value: float
    # 90% Prediction Interval terminology
    prediction_interval_lower: float = Field(default=1.0, description="Lower bound of 90% prediction interval")
    prediction_interval_upper: float = Field(default=5.0, description="Upper bound of 90% prediction interval")
    # Backward compatibility aliases
    confidence_interval_lower: Optional[float] = None
    confidence_interval_upper: Optional[float] = None
    confidence: str = Field(default="MEDIUM", description="LOW, MEDIUM, HIGH")

    @model_validator(mode='before')
    @classmethod
    def reconcile_intervals(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if 'prediction_interval_lower' not in values and 'confidence_interval_lower' in values:
                values['prediction_interval_lower'] = values['confidence_interval_lower']
            if 'prediction_interval_upper' not in values and 'confidence_interval_upper' in values:
                values['prediction_interval_upper'] = values['confidence_interval_upper']
            if 'confidence_interval_lower' not in values and 'prediction_interval_lower' in values:
                values['confidence_interval_lower'] = values['prediction_interval_lower']
            if 'confidence_interval_upper' not in values and 'prediction_interval_upper' in values:
                values['confidence_interval_upper'] = values['prediction_interval_upper']
        return values

class ForecastResponse(BaseModel):
    forecast_id: str
    target: str = "food_rating"
    entity: Optional[str] = None
    meal_type: Optional[str] = None
    forecast_date: Optional[date] = None
    prediction: Optional[float] = None
    # 90% Prediction Interval bounds
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    prediction_interval_lower: Optional[float] = None
    prediction_interval_upper: Optional[float] = None
    confidence: str = "MEDIUM"  # Qualitative data-sufficiency tier: HIGH, MEDIUM, LOW
    horizon_days: int = 1
    data_points: List[ForecastDataPoint] = Field(default_factory=list)
    model_version: str = "fc-engine-v1.0-ml"
    baseline_model: str = "rolling-ewma-baseline"
    feature_summary: Dict[str, Any] = Field(default_factory=dict)
    top_features: List[Dict[str, Any]] = Field(default_factory=list)
    data_status: str = "SUFFICIENT"
    assumptions: List[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode='before')
    @classmethod
    def reconcile_bounds(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if 'prediction_interval_lower' not in values and 'lower_bound' in values:
                values['prediction_interval_lower'] = values['lower_bound']
            if 'prediction_interval_upper' not in values and 'upper_bound' in values:
                values['prediction_interval_upper'] = values['upper_bound']
            if 'lower_bound' not in values and 'prediction_interval_lower' in values:
                values['lower_bound'] = values['prediction_interval_lower']
            if 'upper_bound' not in values and 'prediction_interval_upper' in values:
                values['upper_bound'] = values['prediction_interval_upper']
        return values

# ==========================================
# 3. SIMULATION ENGINE SCHEMAS
# ==========================================

class MenuProposalItem(BaseModel):
    target_date: date
    meal_type: str
    proposed_food_name: str

class ScenarioMeal(BaseModel):
    meal: str = "Dinner"
    items: List[str]

class ScenarioChange(BaseModel):
    change_type: str = "FOOD_REPLACEMENT"
    field: Optional[str] = None
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None

class ScenarioComparisonPoint(BaseModel):
    prediction: float
    lower_bound: float
    upper_bound: float
    confidence: str = "MEDIUM"
    p10: Optional[float] = None
    p50: Optional[float] = None
    p90: Optional[float] = None
    std: Optional[float] = None

class MonteCarloDistribution(BaseModel):
    runs: int
    mean: float
    std: float
    p10: float
    p25: Optional[float] = None
    p50: float
    p75: Optional[float] = None
    p90: float
    probability_of_improvement: float
    probability_of_rating_drop: float

class SimulationDelta(BaseModel):
    mean_delta: float
    p10_delta: Optional[float] = None
    p50_delta: Optional[float] = None
    p90_delta: Optional[float] = None
    direction: str = "NEUTRAL"

class SimulatedOutcome(BaseModel):
    metric: str
    projected_mean: float
    projected_min: float
    projected_max: float
    probability_of_rating_drop: float
    risk_level: str = Field(..., description="LOW, MODERATE, HIGH")

class SimulationRequest(BaseModel):
    simulation_name: Optional[str] = "Menu What-If Simulation"
    scenario_type: Optional[str] = "FOOD_REPLACEMENT"
    simulation_date: Optional[date] = None
    meal_type: Optional[str] = "Dinner"
    baseline_food: Optional[str] = None
    scenario_food: Optional[str] = None
    baseline_meal: Optional[ScenarioMeal] = None
    scenario_meal: Optional[ScenarioMeal] = None
    repetition_delta_days: Optional[int] = None
    poll_vote_share_shift: Optional[float] = None
    proposed_schedule: Optional[List[MenuProposalItem]] = None
    runs: int = Field(default=1000, ge=10, le=10000)
    monte_carlo_runs: Optional[int] = None

class SimulationResponse(BaseModel):
    simulation_id: str
    simulation_name: str
    scenario_type: str = "FOOD_REPLACEMENT"
    simulation_date: Optional[date] = None
    meal_type: Optional[str] = "Dinner"
    baseline: ScenarioComparisonPoint
    scenario: ScenarioComparisonPoint
    delta: SimulationDelta
    distribution: MonteCarloDistribution
    confidence: str = "MEDIUM"
    model_version: str = "sim-engine-v1.0-mc"
    assumptions: List[str] = Field(default_factory=list)
    key_tradeoffs: List[str] = Field(default_factory=list)
    outcomes: List[SimulatedOutcome] = Field(default_factory=list)
    audit_persistence_status: str = Field(default="PERSISTED", description="PERSISTED, FAILED, or DISABLED")
    audit_warning: Optional[str] = Field(default=None, description="Safe user-facing warning if audit persistence failed")
    computed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==========================================
# 4. FEATURE PIPELINE SCHEMAS
# ==========================================

class FoodFeatureRecord(BaseModel):
    food_id: int
    food_name: str
    meal_type: str
    rolling_avg_rating_7d: float
    rolling_avg_rating_30d: float
    frequency_count_7d: int
    frequency_count_14d: int
    frequency_count_30d: int
    repetition_score: float
    poll_preference_vote_share: float
    complaint_count_7d: int
    top_complaint_theme: Optional[str] = None
