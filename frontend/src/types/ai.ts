export interface MetricSummary {
  metric: string;
  current_value: number;
  previous_value: number;
  change: number;
  percent_change: number;
  p_value?: number;
  statistically_significant: boolean;
}

export interface EvidenceItem {
  signal: string;
  target_entity?: string;
  before_value: number;
  after_value: number;
  change: number;
  relative_change_pct: number;
  p_value?: number;
  details?: string;
}

export interface PossibleFactor {
  factor_id: string;
  description: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  confidence_score: number;
  supporting_evidence_indices: number[];
}

export interface DataWindowInfo {
  target_start_date: string;
  target_end_date: string;
  target_sample_count: number;
  comparison_start_date?: string;
  comparison_end_date?: string;
  comparison_sample_count: number;
  cohort_filter?: string;
}

export interface InvestigationResponse {
  investigation_id: string;
  target_metric: string;
  metric_summary: MetricSummary;
  observations: string[];
  evidence: EvidenceItem[];
  possible_factors: PossibleFactor[];
  data_window: DataWindowInfo;
  engine_version: string;
  computed_at: string;
}

export interface InvestigationRequest {
  start_date: string;
  end_date: string;
  target_metric?: string;
  comparison_start_date?: string;
  comparison_end_date?: string;
  meal_type?: string;
  food_name?: string;
}

export interface ForecastDataPoint {
  forecast_date: string;
  metric: string;
  target_entity?: string;
  predicted_value: number;
  prediction_interval_lower: number;
  prediction_interval_upper: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
}

export interface ForecastResponse {
  forecast_id: string;
  target: string;
  entity?: string;
  meal_type?: string;
  forecast_date?: string;
  prediction?: number;
  prediction_interval_lower?: number;
  prediction_interval_upper?: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  horizon_days: number;
  data_points: ForecastDataPoint[];
  model_version: string;
  baseline_model: string;
  feature_summary: Record<string, any>;
  top_features: Array<{ feature: string; importance: number; direction?: string }>;
  data_status: "SUFFICIENT" | "INSUFFICIENT";
  assumptions: string[];
  generated_at: string;
}

export interface ForecastRequest {
  target?: string;
  food_name?: string;
  meal_type?: string;
  forecast_date?: string;
  horizon_days?: number;
}

export interface ScenarioComparisonPoint {
  prediction: number;
  lower_bound: number;
  upper_bound: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  p10?: number;
  p50?: number;
  p90?: number;
  std?: number;
}

export interface MonteCarloDistribution {
  runs: number;
  mean: number;
  std: number;
  p10: number;
  p25?: number;
  p50: number;
  p75?: number;
  p90: number;
  probability_of_improvement: number;
  probability_of_rating_drop: number;
}

export interface SimulationDelta {
  mean_delta: number;
  p10_delta?: number;
  p50_delta?: number;
  p90_delta?: number;
  direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
}

export interface SimulatedOutcome {
  metric: string;
  projected_mean: number;
  projected_min: number;
  projected_max: number;
  probability_of_rating_drop: number;
  risk_level: "LOW" | "MODERATE" | "HIGH";
}

export interface SimulationResponse {
  simulation_id: string;
  simulation_name: string;
  scenario_type: string;
  simulation_date?: string;
  meal_type?: string;
  baseline: ScenarioComparisonPoint;
  scenario: ScenarioComparisonPoint;
  delta: SimulationDelta;
  distribution: MonteCarloDistribution;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  model_version: string;
  assumptions: string[];
  key_tradeoffs: string[];
  outcomes: SimulatedOutcome[];
  computed_at: string;
}

export interface SimulationRequest {
  simulation_name?: string;
  scenario_type: "FOOD_REPLACEMENT" | "REPETITION_CHANGE" | "MEAL_COMBINATION";
  meal_type?: string;
  baseline_food?: string;
  scenario_food?: string;
  baseline_meal?: { meal: string; items: string[] };
  scenario_meal?: { meal: string; items: string[] };
  repetition_delta_days?: number;
  runs?: number;
}

export interface SimulationHistoryItem {
  id?: number;
  simulation_id: string;
  simulation_name: string;
  scenario_type: string;
  risk_level: string;
  model_version: string;
  created_at: string;
  input_schedule?: Record<string, any>;
  projected_outcomes?: Record<string, any>;
  key_tradeoffs?: string[];
}
