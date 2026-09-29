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

export interface DishFeedbackItem {
  food_name: string;
  meal_type?: string;
  review_count: number;
  average_rating: number;
  previous_rating?: number | null;
  change?: number | null;
}

export interface RatingDistribution {
  stars_1: number;
  stars_2: number;
  stars_3: number;
  stars_4: number;
  stars_5: number;
  stars_1_pct: number;
  stars_2_pct: number;
  stars_3_pct: number;
  stars_4_pct: number;
  stars_5_pct: number;
}

export interface MealRatingItem {
  meal_type: string;
  target_rating: number;
  baseline_rating: number;
  change: number;
  review_count: number;
}

export interface StudentFeedbackTheme {
  theme: string;
  count: number;
  share_pct: number;
  sentiment: "positive" | "negative";
  example_note?: string;
}

export interface FoodSatisfactionDetails {
  unique_students: number;
  comparison_unique_students: number;
  rating_distribution: RatingDistribution;
  meal_breakdown: MealRatingItem[];
  common_concerns: StudentFeedbackTheme[];
  positive_highlights: StudentFeedbackTheme[];
  most_reviewed_dishes: DishFeedbackItem[];
  lowest_rated_dishes: DishFeedbackItem[];
  highest_rated_dishes: DishFeedbackItem[];
}

export interface ComplaintThemeItem {
  theme_id: string;
  theme_name: string;
  count: number;
  baseline_count: number;
  change: number;
  share_pct: number;
  velocity_multiplier: number;
}

export interface ComplaintDailyCount {
  date: string;
  count: number;
}

export interface ComplaintVolumeDetails {
  unique_complainants: number;
  comparison_unique_complainants: number;
  themes: ComplaintThemeItem[];
  top_theme_name?: string | null;
  top_theme_count: number;
  top_theme_share_pct: number;
  daily_trend: ComplaintDailyCount[];
  category_breakdown: Array<{ category: string; count: number; share_pct: number }>;
}

export interface PollOptionChoice {
  food_name: string;
  vote_count: number;
  share_pct: number;
}

export interface ActivePollItem {
  poll_id: number;
  poll_date: string;
  total_votes: number;
  winning_option: string;
  winning_share_pct: number;
  options: PollOptionChoice[];
}

export interface TopChosenOption {
  food_name: string;
  total_votes: number;
  polls_featured: number;
}

export interface PollParticipationDetails {
  unique_voters: number;
  comparison_unique_voters: number;
  total_polls: number;
  comparison_total_polls: number;
  average_votes_per_poll: number;
  comparison_average_votes_per_poll: number;
  most_active_polls: ActivePollItem[];
  top_chosen_options: TopChosenOption[];
  daily_trend: Array<{ date: string; votes: number }>;
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
  food_details?: FoodSatisfactionDetails;
  complaint_details?: ComplaintVolumeDetails;
  poll_details?: PollParticipationDetails;
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
  audit_persistence_status?: "PERSISTED" | "FAILED" | "DISABLED";
  audit_warning?: string;
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
