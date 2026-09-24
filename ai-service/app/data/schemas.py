"""
Pydantic contracts and data transfer schemas for MESO AI microservice.
Conforms to the 4-tier explainability protocol:
- OBSERVATION
- EVIDENCE
- POSSIBLE FACTORS
- CONFIDENCE
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field

# ==========================================
# EXPLAINABILITY BUILDING BLOCKS
# ==========================================

class DataWindowInfo(BaseModel):
    start_date: date
    end_date: date
    sample_count: int = Field(..., description="Number of underlying records analyzed in this window")
    cohort_filter: Optional[str] = None

class EvidenceItem(BaseModel):
    metric: str = Field(..., description="Name of empirical metric (e.g. food_frequency_7d, complaint_count_oil)")
    target_entity: Optional[str] = Field(None, description="Food name or meal type if applicable")
    observed_value: float = Field(..., description="Value measured during problem window")
    baseline_value: float = Field(..., description="Baseline historical norm for comparison")
    significance_p_value: Optional[float] = Field(None, description="Statistical significance p-value if computed")
    notes: Optional[str] = None

class PossibleFactor(BaseModel):
    factor_id: str = Field(..., description="Machine-readable factor code (e.g. HIGH_OIL_PREPARATION)")
    description: str = Field(..., description="Human-readable explanation of why this factor was identified")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Calibrated confidence score between 0.0 and 1.0")
    supporting_evidence_indices: List[int] = Field(
        default_factory=list,
        description="Zero-indexed references into the parent evidence list supporting this factor"
    )

# ==========================================
# 1. ROOT CAUSE ENGINE SCHEMAS
# ==========================================

class InvestigationRequest(BaseModel):
    target_metric: str = Field(..., description="Target metric to investigate (e.g. DINNER_RATING_DECLINE, COMPLAINT_SPIKE)")
    start_date: date
    end_date: date
    meal_type: Optional[str] = Field(None, description="Optional meal filter: Breakfast, Lunch, Dinner")
    food_id: Optional[int] = Field(None, description="Optional specific food item to investigate")

class InvestigationResponse(BaseModel):
    investigation_id: str
    target_metric: str
    target_period: DataWindowInfo
    observations: List[str] = Field(..., description="Direct factual shifts observed in metrics")
    evidence: List[EvidenceItem] = Field(..., description="Empirical evidence supporting the investigation")
    possible_factors: List[PossibleFactor] = Field(..., description="Ranked causal hypotheses with confidence")
    model_version: str = "rc-engine-v1.0-interface"
    computed_at: datetime = Field(default_factory=datetime.utcnow)

# ==========================================
# 2. FORECAST ENGINE SCHEMAS
# ==========================================

class ForecastRequest(BaseModel):
    food_id: Optional[int] = None
    food_name: Optional[str] = None
    horizon_days: int = Field(default=7, ge=1, le=30, description="Forecast horizon in days")
    metrics: List[str] = Field(
        default=["average_rating", "complaint_probability"],
        description="Metrics to forecast"
    )

class ForecastDataPoint(BaseModel):
    forecast_date: date
    metric: str
    predicted_value: float
    confidence_interval_lower: float
    confidence_interval_upper: float

class ForecastResponse(BaseModel):
    forecast_id: str
    food_name: Optional[str] = None
    horizon_days: int
    data_points: List[ForecastDataPoint]
    assumptions: List[str]
    model_version: str = "fc-engine-v1.0-interface"
    computed_at: datetime = Field(default_factory=datetime.utcnow)

# ==========================================
# 3. SIMULATION ENGINE SCHEMAS
# ==========================================

class MenuProposalItem(BaseModel):
    target_date: date
    meal_type: str
    proposed_food_name: str

class SimulationRequest(BaseModel):
    simulation_name: str
    scenario_type: str = Field(..., description="MENU_REPETITION_CHANGE, CHEF_ROTATION, VENDOR_CHANGE")
    proposed_schedule: List[MenuProposalItem]
    monte_carlo_runs: int = Field(default=100, ge=10, le=1000)

class SimulatedOutcome(BaseModel):
    metric: str
    projected_mean: float
    projected_min: float
    projected_max: float
    probability_of_rating_drop: float
    risk_level: str = Field(..., description="LOW, MODERATE, HIGH")

class SimulationResponse(BaseModel):
    simulation_id: str
    simulation_name: str
    outcomes: List[SimulatedOutcome]
    key_tradeoffs: List[str]
    model_version: str = "sim-engine-v1.0-interface"
    computed_at: datetime = Field(default_factory=datetime.utcnow)

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
