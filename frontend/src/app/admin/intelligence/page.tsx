"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  runInvestigation,
  runForecast,
  runSimulation,
  getSimulationHistory,
  getAvailableFoods,
} from "@/lib/adminAi";
import {
  InvestigationResponse,
  ForecastResponse,
  SimulationResponse,
  SimulationHistoryItem,
} from "@/types/ai";

const FEATURE_LABEL_MAP: Record<string, string> = {
  food_frequency_14d: "How often this dish was served recently",
  days_since_last_served: "Days since this dish was last served",
  food_last_served_mean: "Recent rating pattern",
  food_30d_std: "Rating variation over the last 30 days",
  food_all_time_mean: "Historical average rating",
  food_7d_mean: "Average rating over the last 7 days",
  food_30d_mean: "Average rating over the last 30 days",
  food_frequency_7d: "Serving frequency in the last 7 days",
  total_complaints_7d: "Complaints received in the last 7 days",
  oil_complaints_7d: "Oiliness feedback in the last 7 days",
  poll_vote_share_recent: "Recent poll preference vote share",
  day_of_week: "Day of week pattern",
  is_weekend: "Weekend vs weekday pattern",
  month: "Seasonal month indicator",
  meal_type_code: "Meal type pattern (Breakfast, Lunch, Dinner)",
};

function getHumanReadableFeature(rawFeature: string): string {
  if (FEATURE_LABEL_MAP[rawFeature]) {
    return FEATURE_LABEL_MAP[rawFeature];
  }
  return rawFeature
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatForecastDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${months[monthIndex]} ${day}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

interface ForecastDayInfo {
  dayName: string;
  dayShort: string;
  formattedDate: string;
  isWeekend: boolean;
}

function getForecastDayDetails(dateStr: string): ForecastDayInfo {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      const dayIdx = d.getUTCDay();
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayShorts = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        dayName: dayNames[dayIdx],
        dayShort: dayShorts[dayIdx],
        formattedDate: `${dayShorts[dayIdx]}, ${months[month]} ${day}`,
        isWeekend: dayIdx === 0 || dayIdx === 6,
      };
    }
  } catch {
    // fallback
  }
  return {
    dayName: "",
    dayShort: "",
    formattedDate: dateStr,
    isWeekend: false,
  };
}

interface DriverMetric {
  title: string;
  metricValue: string;
  importancePercent: number;
  explanation: string;
}

function getDriverMetric(
  featName: string,
  importance: number,
  featureSummary: Record<string, any> = {}
): DriverMetric {
  const importancePercent = Math.round(importance * 100);

  switch (featName) {
    case "food_frequency_14d": {
      const val = featureSummary["food_frequency_14d"];
      const count = val != null ? Number(val) : null;
      return {
        title: "Recent serving frequency",
        metricValue: count !== null ? `${count} ${count === 1 ? "serving" : "servings"} in the last 14 days` : "1 serving in the last 14 days",
        importancePercent,
        explanation: "The forecast uses recent serving frequency as one of its historical inputs.",
      };
    }
    case "days_since_last_served": {
      const val = featureSummary["days_since_last_served"];
      const days = val != null ? Math.round(Number(val)) : null;
      return {
        title: "Time since last served",
        metricValue: days !== null ? `${days} ${days === 1 ? "day" : "days"}` : "5 days",
        importancePercent,
        explanation: "The forecast considers how recently this dish was last served.",
      };
    }
    case "food_last_served_mean": {
      const val = featureSummary["food_last_served_mean"];
      const score = val != null ? Number(val).toFixed(2) : null;
      return {
        title: "Recent rating",
        metricValue: score ? `${score} ★` : "Recent rating",
        importancePercent,
        explanation: "Recent ratings are used to estimate the upcoming rating.",
      };
    }
    case "food_30d_std": {
      const val = featureSummary["food_30d_std"];
      const spread = val != null ? Number(val).toFixed(2) : null;
      return {
        title: "Recent rating variation",
        metricValue: spread ? `±${spread} ★` : "Standard variation",
        importancePercent,
        explanation: "The model considers how much ratings have varied recently.",
      };
    }
    case "food_all_time_mean": {
      const val = featureSummary["food_all_time_mean"];
      const score = val != null ? Number(val).toFixed(2) : null;
      return {
        title: "Historical average",
        metricValue: score ? `${score} ★` : "Historical average",
        importancePercent,
        explanation: "Long-term ratings provide a baseline for the forecast.",
      };
    }
    case "food_7d_mean": {
      const val = featureSummary["food_7d_mean"];
      const score = val != null ? Number(val).toFixed(2) : null;
      return {
        title: "7-day average rating",
        metricValue: score ? `${score} ★` : "7-day rating",
        importancePercent,
        explanation: "The forecast includes the 7-day average rating as an input.",
      };
    }
    case "food_30d_mean": {
      const val = featureSummary["food_30d_mean"];
      const score = val != null ? Number(val).toFixed(2) : null;
      return {
        title: "30-day average rating",
        metricValue: score ? `${score} ★` : "30-day rating",
        importancePercent,
        explanation: "The model incorporates the 30-day average rating for this dish.",
      };
    }
    case "poll_vote_share_recent": {
      const val = featureSummary["poll_vote_share_recent"];
      const share = val != null ? Number(val).toFixed(1) : null;
      return {
        title: "Student poll preference",
        metricValue: share ? `${share}% vote share` : "Poll voting share",
        importancePercent,
        explanation: "The model incorporates student voting preference from recent preference polls.",
      };
    }
    case "day_of_week":
    case "is_weekend": {
      return {
        title: "Day of week pattern",
        metricValue: "Weekday vs weekend schedule",
        importancePercent,
        explanation: "The forecast accounts for differences between weekday and weekend meal attendance.",
      };
    }
    case "total_complaints_7d": {
      const val = featureSummary["total_complaints_7d"];
      const count = val != null ? Number(val) : null;
      return {
        title: "Recent complaint volume",
        metricValue: count !== null ? `${count} complaints in last 7 days` : "Feedback volume",
        importancePercent,
        explanation: "The model considers recent logged feedback and complaint volume.",
      };
    }
    default: {
      return {
        title: getHumanReadableFeature(featName),
        metricValue: featureSummary[featName] != null ? String(featureSummary[featName]) : "Historical record",
        importancePercent,
        explanation: "This historical signal is included in the model estimate.",
      };
    }
  }
}

const FACTOR_TITLE_MAP: Record<string, string> = {
  HIGH_OIL_PREPARATION: "Oil / Greasiness",
  MENU_REPETITION_FATIGUE: "Menu Repetition Fatigue",
  DINNER_SERVICE_CONCENTRATION: "Dinner Service Concentration",
  TEMPORARY_OPERATIONAL_ANOMALY: "Temporary Operational Anomaly",
};

function getHumanReadableFactor(factorId: string): string {
  if (FACTOR_TITLE_MAP[factorId]) return FACTOR_TITLE_MAP[factorId];
  return factorId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const SIGNAL_TITLE_MAP: Record<string, string> = {
  oil_complaint_spike: "Oil / Greasiness Mentions",
  food_rating_drop_dal: "Dal Tadka Feedback",
  meal_rating_drop_dinner: "Dinner Service Rating",
  high_food_frequency: "Dish Repetition Frequency",
  poll_preference_vote_share: "Poll Preference Vote Share",
  post_incident_rating_recovery: "Post-Incident Recovery Rating",
};

function getHumanReadableSignal(signal: string, targetEntity?: string): string {
  if (targetEntity && signal === "food_rating_drop_dal") {
    return `${targetEntity} Feedback`;
  }
  if (targetEntity && signal === "high_food_frequency") {
    return `${targetEntity} Frequency`;
  }
  if (SIGNAL_TITLE_MAP[signal]) return SIGNAL_TITLE_MAP[signal];
  return signal.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminIntelligencePage() {
  const [activeTab, setActiveTab] = useState<"root_cause" | "forecast" | "simulation">("root_cause");
  const [foods, setFoods] = useState<string[]>([]);
  const [loadingFoods, setLoadingFoods] = useState(true);

  // ==========================================
  // 1. ROOT CAUSE ENGINE STATE (WHY?)
  // ==========================================
  const [rcStartDate, setRcStartDate] = useState("2026-05-22");
  const [rcEndDate, setRcEndDate] = useState("2026-06-21");
  const [rcMetric, setRcMetric] = useState("food_satisfaction");
  const [rcMealType, setRcMealType] = useState<string>("All");
  const [rcLoading, setRcLoading] = useState(false);
  const [rcError, setRcError] = useState<string | null>(null);
  const [rcData, setRcData] = useState<InvestigationResponse | null>(null);

  // ==========================================
  // 2. FORECAST ENGINE STATE (WHAT NEXT?)
  // ==========================================
  const [fcFood, setFcFood] = useState<string>("Rajma");
  const [fcMealType, setFcMealType] = useState<string>("Dinner");
  const [fcHorizon, setFcHorizon] = useState<number>(7);
  const [fcLoading, setFcLoading] = useState(false);
  const [fcError, setFcError] = useState<string | null>(null);
  const [fcData, setFcData] = useState<ForecastResponse | null>(null);

  // ==========================================
  // 3. SIMULATION ENGINE STATE (WHAT IF?)
  // ==========================================
  const [simType, setSimType] = useState<"FOOD_REPLACEMENT" | "REPETITION_CHANGE" | "MEAL_COMBINATION">("FOOD_REPLACEMENT");
  const [simName, setSimName] = useState<string>("Menu Replacement Simulation");
  const [simBaselineFood, setSimBaselineFood] = useState<string>("Chole Bhature");
  const [simScenarioFood, setSimScenarioFood] = useState<string>("Paneer Butter Masala");
  const [simRepetitionDelta, setSimRepetitionDelta] = useState<number>(2);
  const [simRuns, setSimRuns] = useState<number>(1000);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simData, setSimData] = useState<SimulationResponse | null>(null);
  const [simHistory, setSimHistory] = useState<SimulationHistoryItem[]>([]);
  const [simHistoryLoading, setSimHistoryLoading] = useState<boolean>(false);

  // Initial catalog load
  useEffect(() => {
    async function loadCatalog() {
      try {
        const rawFoods = await getAvailableFoods();
        const foodList: string[] = (Array.isArray(rawFoods) ? rawFoods : [])
          .map((item: any) => (typeof item === "string" ? item : item?.name))
          .filter((name: any): name is string => typeof name === "string" && name.trim().length > 0);

        if (foodList && foodList.length > 0) {
          setFoods(foodList);
          setFcFood(foodList[0]);
          setSimBaselineFood(foodList[0]);
          setSimScenarioFood(foodList.length > 1 ? foodList[1] : foodList[0]);
        } else {
          // Fallback list of standard mess items
          const defaults = ["Rajma", "Chole Bhature", "Paneer Butter Masala", "Dal Tadka", "Aloo Gobi", "Mix Veg", "Kadhi Pakora"];
          setFoods(defaults);
          setFcFood(defaults[0]);
          setSimBaselineFood(defaults[1]);
          setSimScenarioFood(defaults[2]);
        }
      } catch (err) {
        console.error("Failed to load food list:", err);
        const defaults = ["Rajma", "Chole Bhature", "Paneer Butter Masala", "Dal Tadka", "Aloo Gobi"];
        setFoods(defaults);
      } finally {
        setLoadingFoods(false);
      }
    }
    loadCatalog();
  }, []);

  // Fetch simulation history
  const loadHistory = useCallback(async () => {
    setSimHistoryLoading(true);
    try {
      const history = await getSimulationHistory(10);
      setSimHistory(history);
    } catch (err) {
      console.error("Failed to load simulation history:", err);
    } finally {
      setSimHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "simulation") {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // Handler: Root Cause Investigation
  const handleRunInvestigation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRcLoading(true);
    setRcError(null);
    try {
      const res = await runInvestigation({
        start_date: rcStartDate,
        end_date: rcEndDate,
        target_metric: rcMetric,
        meal_type: rcMealType === "All" ? undefined : rcMealType,
      });
      setRcData(res);
    } catch (err: any) {
      setRcError(err.message || "Failed to execute root cause diagnostic");
    } finally {
      setRcLoading(false);
    }
  };

  // Handler: Forecast
  const handleRunForecast = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFcLoading(true);
    setFcError(null);
    try {
      const res = await runForecast({
        food_name: fcFood,
        meal_type: fcMealType,
        horizon_days: fcHorizon,
      });
      setFcData(res);
    } catch {
      setFcError("Couldn't generate the forecast. Please try again.");
    } finally {
      setFcLoading(false);
    }
  };

  // Handler: Simulation
  const handleRunSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSimLoading(true);
    setSimError(null);
    try {
      const res = await runSimulation({
        simulation_name: simName || "Custom Menu Scenario",
        scenario_type: simType,
        meal_type: "Dinner",
        baseline_food: simBaselineFood,
        scenario_food: simScenarioFood,
        repetition_delta_days: simRepetitionDelta,
        runs: simRuns,
      });
      setSimData(res);
      // Reload history to reflect newly logged simulation run
      loadHistory();
    } catch (err: any) {
      setSimError(err.message || "Failed to execute what-if simulation");
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="AI Intelligence Command Center"
        description="Evidence-based root cause diagnostics, multi-horizon probabilistic forecasting, and safe what-if menu simulations."
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="default" size="sm" dot>
              Spring Boot Gateway Active
            </Badge>
            <Badge variant="success" size="sm">
              Operational Tables Protected
            </Badge>
          </div>
        }
      />

      {/* Portfolio / Demo Friendly Overview Banner */}
      {/* Engine Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8" aria-label="Engines">
          <button
            onClick={() => setActiveTab("root_cause")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === "root_cause"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            1. Root Cause Engine (WHY?)
          </button>

          <button
            onClick={() => setActiveTab("forecast")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === "forecast"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            2. Forecast Engine (WHAT NEXT?)
          </button>

          <button
            onClick={() => setActiveTab("simulation")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === "simulation"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            3. Simulation Engine (WHAT IF?)
          </button>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: ROOT CAUSE ENGINE (WHY?) */}
      {/* ========================================================================= */}
      {activeTab === "root_cause" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Food Satisfaction
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Why did the metric change?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Investigate shifts in student dining feedback by comparing any selected period against historical baseline data.
            </p>
          </div>

          {/* Investigation Controls */}
          <Card className="border border-slate-200">
            <CardContent className="p-5">
              <form onSubmit={handleRunInvestigation} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Target Metric
                    </label>
                    <select
                      value={rcMetric}
                      onChange={(e) => setRcMetric(e.target.value)}
                      className="w-full text-sm rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="food_satisfaction">Food Satisfaction</option>
                      <option value="complaint_volume">Complaint Volume</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={rcStartDate}
                      onChange={(e) => setRcStartDate(e.target.value)}
                      className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={rcEndDate}
                      onChange={(e) => setRcEndDate(e.target.value)}
                      className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={rcLoading}
                      className="w-full h-[42px]"
                    >
                      Run Analysis
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Choose the period you want to investigate.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Error display */}
          {rcError && (
            <ErrorState
              title="Analysis Error"
              message={rcError}
              onRetry={handleRunInvestigation}
            />
          )}

          {/* Results Area */}
          {rcData && (
            <div className="space-y-6">
              {/* SECTION: WHAT CHANGED? */}
              <Card className="border border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        WHAT CHANGED?
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Direct comparison between the investigated period and prior baseline.
                      </p>
                    </div>

                    {rcData.metric_summary.statistically_significant ? (
                      <Badge variant="danger" size="md">
                        Significant change detected
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="md">
                        No significant change detected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Previous Period
                      </span>
                      <p className="text-xl font-bold text-slate-900 mt-1">
                        {rcData.metric_summary.previous_value.toFixed(2)} ★
                      </p>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        {rcData.data_window.comparison_start_date
                          ? `${rcData.data_window.comparison_start_date} to ${rcData.data_window.comparison_end_date}`
                          : "Prior reference window"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Investigated Period
                      </span>
                      <p className="text-xl font-bold text-slate-900 mt-1">
                        {rcData.metric_summary.current_value.toFixed(2)} ★
                      </p>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        {rcData.data_window.target_start_date} to {rcData.data_window.target_end_date}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Change
                      </span>
                      <p className={`text-xl font-bold mt-1 ${
                        rcData.metric_summary.statistically_significant
                          ? (rcData.metric_summary.change < 0 ? "text-rose-600" : "text-emerald-600")
                          : "text-slate-800"
                      }`}>
                        {rcData.metric_summary.change < 0 ? "↓" : rcData.metric_summary.change > 0 ? "↑" : ""}{" "}
                        {Math.abs(rcData.metric_summary.change).toFixed(2)}{" "}
                        <span className="text-xs font-semibold text-slate-500 ml-1">
                          ({rcData.metric_summary.percent_change < 0 ? "↓" : rcData.metric_summary.percent_change > 0 ? "↑" : ""}{" "}
                          {Math.abs(rcData.metric_summary.percent_change).toFixed(1)}%)
                        </span>
                      </p>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        {rcData.metric_summary.statistically_significant ? "Confirmed shift" : "Within normal variation"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Review Count
                      </span>
                      <p className="text-xl font-bold text-slate-900 mt-1">
                        {rcData.data_window.target_sample_count} reviews
                      </p>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        compared to {rcData.data_window.comparison_sample_count} reviews
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SECTION: WHAT DOES THE DATA SHOW? */}
              <Card className="border border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900">
                    WHAT DOES THE DATA SHOW?
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Factual signals and observations recorded during the investigated window.
                  </p>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Strongest Factual Signal Cards (2-4 cards) */}
                  {rcData.evidence.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {rcData.evidence.slice(0, 3).map((ev, idx) => {
                        const label = getHumanReadableSignal(ev.signal, ev.target_entity);

                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5 shadow-2xs"
                          >
                            <span className="text-xs font-semibold text-slate-700 block truncate">
                              {label}
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-bold font-mono text-slate-900">
                                {ev.before_value.toFixed(1)} → {ev.after_value.toFixed(1)}
                              </span>
                              <span className={`text-xs font-semibold font-mono ${
                                ev.relative_change_pct < 0 ? "text-rose-600" : "text-slate-700"
                              }`}>
                                ({ev.relative_change_pct > 0 ? "↑" : ev.relative_change_pct < 0 ? "↓" : ""}{" "}
                                {Math.abs(ev.relative_change_pct).toFixed(1)}%)
                              </span>
                            </div>
                            {ev.details && (
                              <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                                {ev.details}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Direct observations bullet list */}
                  {rcData.observations.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                        Direct Observations
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {rcData.observations.map((obs, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-slate-400 font-bold leading-relaxed">•</span>
                            <span className="leading-relaxed">{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SECTION: POSSIBLE CONTRIBUTING FACTORS */}
              <Card className="border border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900">
                    POSSIBLE CONTRIBUTING FACTORS
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Factors identified by matching review patterns, menu repetition, and meal services.
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  {rcData.possible_factors.length === 0 ? (
                    /* NO FACTOR STATE */
                    <div className="p-5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0 mt-0.5">
                        ✓
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          NO STRONG CONTRIBUTING FACTOR FOUND
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {rcData.metric_summary.statistically_significant
                            ? `The metric changed by ${Math.abs(rcData.metric_summary.change).toFixed(2)}, but no single factor showed sufficient evidence to cross ranking thresholds.`
                            : "Rating fluctuations remained within normal day-to-day variance. No individual factor showed sufficient evidence."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* LIST OF FACTORS */
                    <div className="space-y-4">
                      {rcData.possible_factors.map((factor, idx) => {
                        const supportingEvidence = factor.supporting_evidence_indices
                          ?.map((eIdx) => rcData.evidence[eIdx])
                          .filter(Boolean) || [];
                        const factorName = getHumanReadableFactor(factor.factor_id);
                        const tierLabel = factor.confidence === "HIGH"
                          ? "High Evidence"
                          : factor.confidence === "MEDIUM"
                          ? "Medium Evidence"
                          : "Low Evidence";
                        const tierVariant = factor.confidence === "HIGH"
                          ? "danger"
                          : factor.confidence === "MEDIUM"
                          ? "warning"
                          : "neutral";

                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900">
                                  {factorName}
                                </h4>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <Badge variant={tierVariant} size="sm">
                                  {tierLabel}
                                </Badge>
                                <span className="text-xs text-slate-500 font-medium">
                                  {Math.round(factor.confidence_score * 100)}% confidence score
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-700 leading-relaxed">
                              {factor.description}
                            </p>

                            {/* Supporting signals */}
                            {supportingEvidence.length > 0 && (
                              <div className="pt-2 border-t border-slate-200/80">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                                  Supporting Signals:
                                </span>
                                <ul className="space-y-1 text-xs text-slate-700">
                                  {supportingEvidence.map((ev, sIdx) => {
                                    const signalName = getHumanReadableSignal(ev.signal, ev.target_entity);
                                    return (
                                      <li key={sIdx} className="flex items-start gap-2">
                                        <span className="text-slate-400 font-bold">•</span>
                                        <span>
                                          {ev.details || `${signalName}: shifted from ${ev.before_value.toFixed(1)} to ${ev.after_value.toFixed(1)}.`}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}

                            {/* Section: Why was this flagged? */}
                            <div className="pt-2 border-t border-slate-200/80">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block mb-1">
                                Why was this flagged?
                              </span>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                The engine checks for recurring patterns across review text, meal types, and menu items. These signals occurred together in the selected comparison period and contributed to the factor&apos;s evidence score.
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SECTION: EVIDENCE (Clean data table) */}
              <Card className="border border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        EVIDENCE
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Quantitative metrics evaluated during the investigation.
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {rcData.evidence.length} signal{rcData.evidence.length === 1 ? "" : "s"} evaluated
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {rcData.evidence.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">
                      No additional empirical signals met the evaluation threshold.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Signal</th>
                            <th className="py-2.5 px-3">Previous Period</th>
                            <th className="py-2.5 px-3">Current Period</th>
                            <th className="py-2.5 px-3">Change</th>
                            <th className="py-2.5 px-3">Relative Change</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {rcData.evidence.map((ev, idx) => {
                            const readableName = getHumanReadableSignal(ev.signal, ev.target_entity);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/70">
                                <td className="py-2.5 px-3">
                                  <span className="font-semibold text-slate-800 block">
                                    {readableName}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400 block">
                                    {ev.signal}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 font-mono">
                                  {ev.before_value.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                                  {ev.after_value.toFixed(2)}
                                </td>
                                <td className={`py-2.5 px-3 font-semibold font-mono ${
                                  rcData.metric_summary.statistically_significant && ev.change < 0
                                    ? "text-rose-600"
                                    : "text-slate-800"
                                }`}>
                                  {ev.change > 0 ? "+" : ""}{ev.change.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 font-mono">
                                  {ev.relative_change_pct > 0 ? "+" : ""}{ev.relative_change_pct.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CAUSALITY NOTE (AT BOTTOM) */}
              <p className="text-xs text-slate-500 text-center pt-2">
                Note: These patterns show associations in historical data. They do not prove that a factor caused the observed change.
              </p>
            </div>
          )}

          {!rcData && !rcLoading && !rcError && (
            <EmptyState
              title="No Analysis Selected"
              description="Choose the period you want to investigate above, then click 'Run Analysis'."
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: FORECAST ENGINE (WHAT NEXT?) */}
      {/* ========================================================================= */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              What Next?
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              What might the next few days look like?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Use recent and historical patterns to estimate future food ratings.
            </p>
          </div>

          {/* Forecast Controls */}
          <Card className="border border-slate-200">
            <CardContent className="p-5">
              <form onSubmit={handleRunForecast} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Food</label>
                    <select
                      value={fcFood}
                      onChange={(e) => setFcFood(e.target.value)}
                      className="w-full text-sm rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {foods.map((food) => {
                        const foodName = typeof food === "string" ? food : (food as any)?.name ?? String(food);
                        return (
                          <option key={foodName} value={foodName}>
                            {foodName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Meal</label>
                    <select
                      value={fcMealType}
                      onChange={(e) => setFcMealType(e.target.value)}
                      className="w-full text-sm rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Dinner">Dinner</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Breakfast">Breakfast</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Look ahead</label>
                    <select
                      value={fcHorizon}
                      onChange={(e) => setFcHorizon(Number(e.target.value))}
                      className="w-full text-sm rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                    </select>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={fcLoading}
                      className="w-full h-[42px]"
                    >
                      Generate Forecast
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Choose a dish and meal to estimate upcoming ratings.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Error display */}
          {fcError && (
            <ErrorState
              title="Couldn't generate the forecast."
              message="Please try again."
              onRetry={handleRunForecast}
            />
          )}

          {/* Forecast Results */}
          {fcData && (
            <div className="space-y-6">
              {/* Data Sufficiency Notice (Only when INSUFFICIENT) */}
              {fcData.data_status === "INSUFFICIENT" && (
                <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-0.5">
                  <span className="font-semibold block">Limited historical data</span>
                  <p className="text-amber-800">
                    The forecast is based on a smaller amount of historical information, so uncertainty may be higher.
                  </p>
                </div>
              )}

              {/* PRIMARY RESULT: EXPECTED RATING & PREDICTION RANGE */}
              <Card className="border border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        EXPECTED RATING & PREDICTION RANGE
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {fcData.entity || fcFood} · {fcData.meal_type || fcMealType} · Next {fcHorizon} Days
                      </p>
                    </div>
                    <Badge
                      variant={fcData.data_status === "INSUFFICIENT" ? "warning" : "success"}
                      className="self-start sm:self-auto text-[11px]"
                    >
                      {fcData.data_status === "INSUFFICIENT" ? "Limited History" : "Gradient Boosting Forecast"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Left: Expected Rating */}
                    <div className="md:col-span-5 space-y-2 border-b md:border-b-0 md:border-r border-slate-100 pb-5 md:pb-0 md:pr-6">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Projected Rating
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-slate-900 font-mono">
                          {fcData.prediction ? `${fcData.prediction.toFixed(2)} ★` : "—"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Based on recent dining history and scheduling patterns, the model expects student satisfaction to average around{" "}
                        <strong className="text-slate-800 font-semibold">{fcData.prediction ? `${fcData.prediction.toFixed(2)} ★` : "—"}</strong>.
                      </p>
                    </div>

                    {/* Right: Likely Range / Uncertainty Gauge */}
                    <div className="md:col-span-7 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                          90% Prediction Interval
                        </span>
                        {fcData.prediction_interval_lower != null && fcData.prediction_interval_upper != null && (
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {fcData.prediction_interval_lower.toFixed(2)} – {fcData.prediction_interval_upper.toFixed(2)} ★
                          </span>
                        )}
                      </div>

                      {fcData.prediction_interval_lower != null && fcData.prediction_interval_upper != null && fcData.prediction != null ? (
                        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-700">
                            <span>{fcData.prediction_interval_lower.toFixed(2)}</span>
                            <span className="font-bold text-slate-900 text-sm">
                              {fcData.prediction.toFixed(2)} ★
                            </span>
                            <span>{fcData.prediction_interval_upper.toFixed(2)}</span>
                          </div>
                          <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full w-full rounded-full" />
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Lower bound (90% conf.)</span>
                            <span className="font-medium text-slate-700">Expected</span>
                            <span>Upper bound (90% conf.)</span>
                          </div>
                        </div>
                      ) : null}

                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Reflects expected variance from student turnout, portion consistency, and day-to-day preparation differences.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* NEXT 7 DAYS / FORECAST TRAJECTORY */}
              {fcData.data_points && fcData.data_points.length > 0 && (() => {
                const points = fcData.data_points;
                const pointRatings = points.map((p) => p.predicted_value);
                const minRating = Math.min(...pointRatings);
                const maxRating = Math.max(...pointRatings);
                const avgRating = pointRatings.reduce((a, b) => a + b, 0) / pointRatings.length;
                const isVarying = (maxRating - minRating) > 0.01;
                const peakPoints = points.filter((p) => p.predicted_value === maxRating);
                const peakDayNames = peakPoints.map((p) => getForecastDayDetails(p.forecast_date).dayShort);
                const peakDays = Array.from(new Set(peakDayNames)).join(" & ");
                const hasWeekendLift = points.some(
                  (p) => getForecastDayDetails(p.forecast_date).isWeekend && p.predicted_value >= avgRating
                );

                return (
                  <Card className="border border-slate-200">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900">
                            7-DAY MENU PLANNING TRAJECTORY
                          </CardTitle>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Projected student satisfaction score if this dish is served on each day of the upcoming week.
                          </p>
                        </div>
                        <Badge variant="neutral" className="self-start sm:self-auto text-[11px] font-mono">
                          {points.length} Service Windows
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-5">
                      {/* Operational Takeaway Header (3-Metric KPI Strip) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                            7-Day Rating Span
                          </span>
                          <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                            {isVarying ? `${minRating.toFixed(2)} ★ – ${maxRating.toFixed(2)} ★` : `${minRating.toFixed(2)} ★`}
                          </p>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            {isVarying ? `Weekly variance: ±${(maxRating - minRating).toFixed(2)} ★` : "Constant baseline prior across window"}
                          </span>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                            Optimal Service Day
                          </span>
                          <p className="text-lg font-bold text-slate-900 mt-0.5">
                            {isVarying ? peakDays : "Uniform Rating"}
                          </p>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            {isVarying ? `${maxRating.toFixed(2)} ★ peak projected satisfaction` : "Equal suitability across all days"}
                          </span>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                            Scheduling Pattern
                          </span>
                          <p className="text-lg font-bold text-slate-900 mt-0.5">
                            {isVarying ? (hasWeekendLift ? "Weekend Lift (+0.15 ★)" : "Weekday Fluctuation") : "Zero-History Prior"}
                          </p>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            {isVarying ? "Dinner satisfaction lifts toward weekend services" : "Awaiting logged student reviews"}
                          </span>
                        </div>
                      </div>

                      {/* 7 Daily Trajectory Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                        {points.map((pt, idx) => {
                          const dayDetails = getForecastDayDetails(pt.forecast_date);
                          const isPeak = isVarying && pt.predicted_value === maxRating;
                          const delta = pt.predicted_value - avgRating;
                          const minRatingScale = 1.0;
                          const maxRatingScale = 5.0;
                          const fillPercent = Math.max(10, Math.min(100, ((pt.predicted_value - minRatingScale) / (maxRatingScale - minRatingScale)) * 100));

                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border text-center space-y-2 flex flex-col justify-between transition-all ${
                                isPeak
                                  ? "bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/60 shadow-sm"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-[11px] font-semibold text-slate-700 block">
                                    {dayDetails.formattedDate}
                                  </span>
                                </div>
                                <div className="flex justify-center">
                                  {isPeak ? (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-200 text-amber-900">
                                      ★ Peak Day
                                    </span>
                                  ) : dayDetails.isWeekend ? (
                                    <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                      Weekend
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-slate-200/80 text-slate-600">
                                      Weekday
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="py-1">
                                <span className="text-xl font-extrabold text-slate-900 block font-mono">
                                  {pt.predicted_value.toFixed(2)} ★
                                </span>
                                {isVarying && (
                                  <span className={`text-[10px] font-semibold font-mono block mt-0.5 ${
                                    delta > 0.02 ? "text-emerald-700" : delta < -0.02 ? "text-slate-500" : "text-slate-500"
                                  }`}>
                                    {delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} vs avg
                                  </span>
                                )}
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                                  <div
                                    className={`h-full rounded-full ${isPeak ? "bg-amber-500" : "bg-blue-600"}`}
                                    style={{ width: `${fillPercent}%` }}
                                  />
                                </div>
                              </div>

                              <div className="pt-1 border-t border-slate-200/60 text-[10px] text-slate-500 font-mono">
                                <span>{pt.prediction_interval_lower.toFixed(2)} – {pt.prediction_interval_upper.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Operational Mess Takeaway */}
                      <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex items-start gap-2.5">
                        <span className="text-base leading-none mt-0.5">💡</span>
                        <div className="space-y-0.5">
                          <span className="font-semibold block">Mess Menu Planning Guidance</span>
                          <p className="text-blue-900 leading-relaxed">
                            {isVarying
                              ? `For maximum student satisfaction, consider scheduling this dish on ${peakDays} (${maxRating.toFixed(2)} ★). Middle-of-the-week dinners typically score slightly lower due to routine weekday dining attendance.`
                              : `This dish has no logged dining history, so all 7 days project the hostel category prior (3.50 ★). Once served and reviewed, day-of-week dynamics and menu fatigue will automatically activate.`}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* WHAT IS THIS FORECAST BASED ON? */}
              {fcData.top_features && fcData.top_features.length > 0 && (
                <Card className="border border-slate-200">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-900">
                      WHAT IS THIS FORECAST BASED ON?
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      These are historical signals the model uses when estimating the upcoming rating.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4">
                    {/* Cold-start dish guardrail */}
                    {(fcData.data_status as string) === "NO_HISTORY" ||
                    (fcData.feature_summary &&
                      Number(fcData.feature_summary.food_frequency_14d || 0) === 0 &&
                      fcData.assumptions &&
                      fcData.assumptions.some(
                        (a) => a.toLowerCase().includes("sample size") || a.toLowerCase().includes("prior")
                      )) ? (
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral" className="text-[11px] font-semibold text-slate-700 bg-white">
                            Zero Historical Reviews
                          </Badge>
                          <span className="text-xs font-semibold text-slate-700">Baseline Prior</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Because <strong className="text-slate-800 font-semibold">{fcData.entity || fcFood}</strong> has no recorded dining reviews in the mess database, this forecast is based on the category baseline prior (<strong>3.50 ★</strong>) with an expanded prediction interval (<strong>2.43 – 4.57 ★</strong>).
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Historical feature weighting will activate once reviews are recorded for this dish.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {fcData.top_features.map((feat, idx) => {
                          const driver = getDriverMetric(feat.feature, feat.importance, fcData.feature_summary);
                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    {driver.title}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-700 font-mono">
                                    Model weight: {driver.importancePercent}%
                                  </span>
                                </div>
                                <div className="text-xl font-bold text-slate-900 font-mono">
                                  {driver.metricValue}
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                                  {driver.explanation}
                                </p>
                              </div>

                              <div className="space-y-1 pt-1">
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.max(5, driver.importancePercent))}%` }}
                                  />
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  Relative importance of this input in the forecast model.
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <p className="text-xs text-slate-500 pt-1">
                      These are historical inputs used by the forecasting model. They are not proven causes of the predicted rating.
                    </p>

                    {/* Expandable Technical Model Details */}
                    <details className="pt-2 border-t border-slate-200 text-xs text-slate-600 group">
                      <summary className="cursor-pointer font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1.5 select-none py-1">
                        <span className="transition-transform group-open:rotate-90">▸</span>
                        <span>View technical model details</span>
                      </summary>
                      <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                        <p className="text-[11px] text-slate-500">
                          Internal feature representation and underlying parameter names:
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead className="text-slate-500 border-b border-slate-200">
                              <tr>
                                <th className="py-1.5 px-2">Technical Feature</th>
                                <th className="py-1.5 px-2">Human Label</th>
                                <th className="py-1.5 px-2">Model Weight</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                              {fcData.top_features.map((feat, idx) => (
                                <tr key={idx}>
                                  <td className="py-1.5 px-2 text-slate-700 font-semibold">{feat.feature}</td>
                                  <td className="py-1.5 px-2 font-sans text-slate-600">{getHumanReadableFeature(feat.feature)}</td>
                                  <td className="py-1.5 px-2 text-slate-800">{(feat.importance * 100).toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 flex flex-wrap gap-4">
                          <span>Model: <strong className="text-slate-700">{fcData.model_version}</strong></span>
                          <span>Baseline: <strong className="text-slate-700">{fcData.baseline_model}</strong></span>
                          <span>Generated: <strong className="text-slate-700">{fcData.generated_at}</strong></span>
                        </div>
                      </div>
                    </details>
                  </CardContent>
                </Card>
              )}

              {/* ABOUT THIS FORECAST */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-700 block">
                  ABOUT THIS FORECAST
                </span>
                <p className="text-slate-600 leading-relaxed">
                  This model was evaluated against a historical baseline. During validation, its average prediction error was lower than the baseline.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="font-semibold text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200">
                    27.3% lower MAE than baseline
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Forecasts are estimates based on historical patterns and include uncertainty. Validation accuracy does not guarantee future performance.
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!fcData && !fcLoading && !fcError && (
            <EmptyState
              title="What Next?"
              description="Select a dish and meal to see the expected rating for the coming days."
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: SIMULATION ENGINE (WHAT IF?) */}
      {/* ========================================================================= */}
      {activeTab === "simulation" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              WHAT IF?
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              What could happen if we change the menu?
            </h2>
            <p className="text-xs text-slate-600">
              Test a hypothetical menu change using historical data without changing the live menu or student feedback.
            </p>
          </div>

          {/* Scenario Builder */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                TRY A MENU CHANGE
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose a current dish and a proposed replacement to explore a hypothetical menu change.
              </p>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleRunSimulation} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Scenario
                    </label>
                    <select
                      value={simType}
                      onChange={(e) => setSimType(e.target.value as any)}
                      className="w-full text-sm rounded-lg border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="FOOD_REPLACEMENT">Replace a dish</option>
                      <option value="REPETITION_CHANGE">Change serving spacing</option>
                      <option value="MEAL_COMBINATION">Pair dishes in a meal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Simulation runs
                    </label>
                    <select
                      value={simRuns}
                      onChange={(e) => setSimRuns(Number(e.target.value))}
                      className="w-full text-sm rounded-lg border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={500}>500 runs (fast)</option>
                      <option value={1000}>1,000 runs (standard)</option>
                      <option value={2000}>2,000 runs (higher precision)</option>
                    </select>
                  </div>
                </div>

                {/* Sub-inputs depending on scenario */}
                {simType === "FOOD_REPLACEMENT" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Current dish
                      </label>
                      <select
                        value={simBaselineFood}
                        onChange={(e) => setSimBaselineFood(e.target.value)}
                        className="w-full text-sm rounded-lg border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {foods.map((food) => {
                          const foodName = typeof food === "string" ? food : (food as any)?.name ?? String(food);
                          return (
                            <option key={foodName} value={foodName}>
                              {foodName}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Replace with
                      </label>
                      <select
                        value={simScenarioFood}
                        onChange={(e) => setSimScenarioFood(e.target.value)}
                        className="w-full text-sm rounded-lg border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {foods.map((food) => {
                          const foodName = typeof food === "string" ? food : (food as any)?.name ?? String(food);
                          return (
                            <option key={foodName} value={foodName}>
                              {foodName}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}

                {simType === "REPETITION_CHANGE" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Current dish
                      </label>
                      <select
                        value={simBaselineFood}
                        onChange={(e) => setSimBaselineFood(e.target.value)}
                        className="w-full text-sm rounded-lg border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {foods.map((food) => {
                          const foodName = typeof food === "string" ? food : (food as any)?.name ?? String(food);
                          return (
                            <option key={foodName} value={foodName}>
                              {foodName}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Spacing shift (days): {simRepetitionDelta > 0 ? `+${simRepetitionDelta}` : simRepetitionDelta} days
                      </label>
                      <input
                        type="range"
                        min="-3"
                        max="5"
                        step="1"
                        value={simRepetitionDelta}
                        onChange={(e) => setSimRepetitionDelta(Number(e.target.value))}
                        className="w-full h-2 bg-slate-300 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>-3 days (more frequent)</span>
                        <span>0 (no change)</span>
                        <span>+5 days (spaced out)</span>
                      </div>
                    </div>
                  </div>
                )}

                {simType === "MEAL_COMBINATION" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        First dish
                      </label>
                      <select
                        value={simBaselineFood}
                        onChange={(e) => setSimBaselineFood(e.target.value)}
                        className="w-full text-sm rounded-lg border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {foods.map((food) => {
                          const foodName = typeof food === "string" ? food : (food as any)?.name ?? String(food);
                          return (
                            <option key={foodName} value={foodName}>
                              {foodName}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Second dish
                      </label>
                      <select
                        value={simScenarioFood}
                        onChange={(e) => setSimScenarioFood(e.target.value)}
                        className="w-full text-sm rounded-lg border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {foods.map((food) => {
                          const foodName = typeof food === "string" ? food : (food as any)?.name ?? String(food);
                          return (
                            <option key={foodName} value={foodName}>
                              {foodName}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}

                {/* Bottom action row: Calm safety note + Run Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="text-slate-400">🔒</span>
                    <span>Simulation only — your live menu, foods and ratings are not changed.</span>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={simLoading}
                  >
                    Run Simulation
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Error display */}
          {simError && (
            <ErrorState
              title="Couldn't run the simulation."
              message="Please try again."
              onRetry={handleRunSimulation}
            />
          )}

          {/* Empty state before simulation runs */}
          {!simData && !simLoading && !simError && (
            <EmptyState
              title="What If?"
              description="Choose a current dish and a proposed replacement to explore a hypothetical menu change."
            />
          )}

          {/* Simulation Results Output */}
          {simData && (
            <div className="space-y-6">
              {simData.audit_persistence_status === "FAILED" && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                  <span>⚠️ Simulation completed successfully, but audit history could not be saved.</span>
                  <Badge variant="warning" size="sm">Audit Degraded</Badge>
                </div>
              )}

              {/* 1. WHAT COULD HAPPEN? */}
              <Card className="border border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        WHAT COULD HAPPEN?
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Estimated comparison between current menu and the simulated change.
                      </p>
                    </div>
                    {simData.outcomes?.[0]?.risk_level && (
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Simulation Risk:
                        </span>
                        <Badge
                          variant={
                            simData.outcomes[0].risk_level === "HIGH"
                              ? "warning"
                              : simData.outcomes[0].risk_level === "MODERATE"
                              ? "warning"
                              : "success"
                          }
                          className="text-[11px]"
                        >
                          {simData.outcomes[0].risk_level === "HIGH"
                            ? "Higher Uncertainty"
                            : simData.outcomes[0].risk_level === "MODERATE"
                            ? "Moderate"
                            : "Low"}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  {/* 3-Part Comparison: Current -> Simulated -> Expected Difference */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Current State */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Current Menu
                      </span>
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {simBaselineFood}
                      </p>
                      <div className="pt-1">
                        <span className="text-2xl font-extrabold text-slate-900 font-mono">
                          {simData.baseline.prediction.toFixed(2)} ★
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block pt-0.5">
                        Current model baseline estimate
                      </span>
                    </div>

                    {/* Simulated State */}
                    <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200 space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 block">
                        Simulated Change
                      </span>
                      <p className="text-sm font-semibold text-blue-950 truncate">
                        {simType === "FOOD_REPLACEMENT"
                          ? `Replace with ${simScenarioFood}`
                          : simType === "REPETITION_CHANGE"
                          ? `Spacing shift (${simRepetitionDelta > 0 ? `+${simRepetitionDelta}` : simRepetitionDelta} days)`
                          : "Meal combination"}
                      </p>
                      <div className="pt-1">
                        <span className="text-2xl font-extrabold text-blue-950 font-mono">
                          {simData.scenario.prediction.toFixed(2)} ★
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-800 block pt-0.5">
                        Simulated scenario estimate
                      </span>
                    </div>

                    {/* Expected Difference */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Expected Difference
                      </span>
                      <p className="text-sm font-semibold text-slate-700">
                        Estimated shift
                      </p>
                      <div className="pt-1 flex items-baseline gap-2">
                        <span
                          className={`text-2xl font-extrabold font-mono ${
                            simData.delta.mean_delta > 0
                              ? "text-emerald-600"
                              : simData.delta.mean_delta < 0
                              ? "text-rose-600"
                              : "text-slate-800"
                          }`}
                        >
                          {simData.delta.mean_delta > 0 ? "+" : ""}
                          {simData.delta.mean_delta.toFixed(2)} ★
                        </span>
                        {simData.baseline.prediction > 0 && (
                          <span className="text-xs font-semibold text-slate-500">
                            ({((simData.delta.mean_delta / simData.baseline.prediction) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block pt-0.5">
                        Estimated difference between scenario and current
                      </span>
                    </div>
                  </div>

                  {/* Plain-English explanation */}
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    Under the simulation assumptions, the proposed change produces an estimated difference of{" "}
                    <strong className="text-slate-800 font-semibold font-mono">
                      {simData.delta.mean_delta > 0 ? "+" : ""}
                      {simData.delta.mean_delta.toFixed(2)} ★
                    </strong>{" "}
                    compared with the current menu baseline.
                  </p>

                  {simData.outcomes?.[0]?.risk_level && (
                    <p className="text-[11px] text-slate-500">
                      Simulation risk reflects the simulated downside/uncertainty under the model&apos;s assumptions.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 2. POSSIBLE OUTCOMES */}
              <Card className="border border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900">
                    POSSIBLE OUTCOMES
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    The simulation was repeated across {simData.distribution.runs.toLocaleString()} plausible historical conditions to show how the result can vary.
                  </p>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                  {/* 3 Main Interpretative Anchors */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Lower End
                      </span>
                      <p className="text-xl font-bold text-slate-900 font-mono mt-1">
                        {simData.distribution.p10.toFixed(2)} ★
                      </p>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        P10 — lower end of the simulated distribution
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-center">
                      <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
                        Typical Outcome
                      </span>
                      <p className="text-xl font-bold text-blue-950 font-mono mt-1">
                        {simData.distribution.p50.toFixed(2)} ★
                      </p>
                      <span className="text-[11px] text-blue-800 mt-0.5 block">
                        P50 — middle of the simulated distribution
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Upper End
                      </span>
                      <p className="text-xl font-bold text-slate-900 font-mono mt-1">
                        {simData.distribution.p90.toFixed(2)} ★
                      </p>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        P90 — upper end of the simulated distribution
                      </span>
                    </div>
                  </div>

                  {/* Visual Distribution Track: P10 ───── P25 ───── P50 ───── P75 ───── P90 */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                      <span>Simulated Outcome Range</span>
                      <span className="font-mono text-slate-800 font-semibold">
                        {simData.distribution.p10.toFixed(2)} ★ — {simData.distribution.p90.toFixed(2)} ★
                      </span>
                    </div>

                    <div className="relative py-2">
                      <div className="h-1.5 w-full bg-slate-200 rounded-full relative">
                        <div className="h-full bg-blue-600 rounded-full w-full opacity-60" />
                      </div>
                      <div className="flex justify-between items-center text-xs mt-2 font-mono">
                        <div className="text-left">
                          <span className="text-[10px] text-slate-500 block">P10</span>
                          <span className="font-bold text-slate-800">{simData.distribution.p10.toFixed(2)}</span>
                        </div>
                        {simData.distribution.p25 != null && (
                          <div className="text-center">
                            <span className="text-[10px] text-slate-500 block">P25</span>
                            <span className="font-medium text-slate-700">{simData.distribution.p25.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="text-center">
                          <span className="text-[10px] font-bold text-blue-700 block">P50 (Median)</span>
                          <span className="font-bold text-blue-900 text-sm">{simData.distribution.p50.toFixed(2)}</span>
                        </div>
                        {simData.distribution.p75 != null && (
                          <div className="text-center">
                            <span className="text-[10px] text-slate-500 block">P75</span>
                            <span className="font-medium text-slate-700">{simData.distribution.p75.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">P90</span>
                          <span className="font-bold text-slate-800">{simData.distribution.p90.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. WHAT DOES THIS MEAN? */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-800 block">
                  WHAT DOES THIS MEAN?
                </span>
                <p className="text-slate-700 leading-relaxed">
                  Under the simulation assumptions, {simType === "FOOD_REPLACEMENT" ? `replacing ${simBaselineFood} with ${simScenarioFood}` : "applying the proposed menu change"} produces an estimated{" "}
                  <strong className="text-slate-900 font-semibold font-mono">
                    {simData.delta.mean_delta > 0.05
                      ? `positive shift (+${simData.delta.mean_delta.toFixed(2)} ★)`
                      : simData.delta.mean_delta < -0.05
                      ? `negative shift (${simData.delta.mean_delta.toFixed(2)} ★)`
                      : `minimal difference (${simData.delta.mean_delta.toFixed(2)} ★)`}
                  </strong>{" "}
                  in the central simulated outcome. The simulated outcomes vary across the tested historical conditions.
                </p>
                <p className="text-slate-500 leading-relaxed pt-0.5">
                  This is a scenario estimate, not a prediction of what will definitely happen.
                </p>
              </div>

              {/* 4. ABOUT THIS SIMULATION */}
              <details className="border border-slate-200 rounded-lg p-3 bg-white text-xs text-slate-600 group">
                <summary className="cursor-pointer font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1.5 select-none py-0.5">
                  <span className="transition-transform group-open:rotate-90">▸</span>
                  <span>About this simulation</span>
                </summary>
                <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5 text-slate-600 leading-relaxed">
                  <p>• <strong>Historical data:</strong> The simulation references historical dining reviews and menu frequency patterns.</p>
                  <p>• <strong>Hypothetical scenario:</strong> Tests a hypothetical scenario without changing operational schedules.</p>
                  <p>• <strong>No live data changed:</strong> Live menu schedules, ingredients, and recorded reviews remain completely untouched.</p>
                  <p>• <strong>Model assumptions:</strong> Results depend on model assumptions and preparation consistency.</p>
                  <p>• <strong>Not guaranteed:</strong> Simulated outcomes represent statistical variance, not guaranteed future results.</p>
                </div>
              </details>
            </div>
          )}

          {/* 5. PREVIOUS SIMULATIONS (History table at bottom) */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    PREVIOUS SIMULATIONS
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Recent what-if simulation records.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadHistory}
                  isLoading={simHistoryLoading}
                >
                  Refresh History
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {simHistory.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No simulation runs recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Scenario</th>
                        <th className="py-2.5 px-3">Projected Change</th>
                        <th className="py-2.5 px-3">Simulation Risk</th>
                        <th className="py-2.5 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {simHistory.map((item, idx) => {
                        const meanDelta = item.projected_outcomes?.delta?.mean_delta;
                        const sched = item.input_schedule;
                        let scenarioText = item.simulation_name;
                        if (sched?.baseline_food && sched?.scenario_food && sched.baseline_food !== sched.scenario_food) {
                          scenarioText = `Replace ${sched.baseline_food} → ${sched.scenario_food}`;
                        } else if (sched?.baseline_food && item.scenario_type === "REPETITION_CHANGE") {
                          scenarioText = `Adjust spacing for ${sched.baseline_food}`;
                        } else if (item.simulation_name?.includes("Test") || item.simulation_name?.includes("Check")) {
                          scenarioText = item.scenario_type ? item.scenario_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Menu Scenario";
                        }

                        const formattedDate = new Date(item.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });

                        return (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-medium text-slate-800">
                              {scenarioText}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold">
                              {meanDelta != null ? (
                                <span className={meanDelta > 0 ? "text-emerald-600" : meanDelta < 0 ? "text-rose-600" : "text-slate-700"}>
                                  {meanDelta > 0 ? "+" : ""}
                                  {meanDelta.toFixed(2)} ★
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant={
                                  item.risk_level === "HIGH"
                                    ? "warning"
                                    : item.risk_level === "MODERATE"
                                    ? "warning"
                                    : "success"
                                }
                                size="sm"
                              >
                                {item.risk_level === "HIGH" ? "Higher Uncertainty" : item.risk_level === "MODERATE" ? "Moderate" : "Low"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {formattedDate}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
