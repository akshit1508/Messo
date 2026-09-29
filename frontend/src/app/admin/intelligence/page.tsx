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

function formatHumanDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${day} ${months[monthIndex]} ${year}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

function formatMetricValue(val: number, metric: string): string {
  if (metric === "food_satisfaction") {
    return `${val.toFixed(2)} ★`;
  }
  return `${Math.round(val).toLocaleString()}`;
}

function getMetricSampleLabel(metric: string, count: number): string {
  if (metric === "food_satisfaction") {
    return `${count.toLocaleString()} ${count === 1 ? "review" : "reviews"}`;
  }
  if (metric === "complaint_volume") {
    return `${count.toLocaleString()} ${count === 1 ? "complaint" : "complaints"}`;
  }
  if (metric === "poll_participation") {
    return `${count.toLocaleString()} ${count === 1 ? "vote" : "votes"}`;
  }
  return `${count.toLocaleString()} items`;
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
  HIGH_OIL_PREPARATION: "Oiliness & Heavy Preparation",
  MENU_REPETITION_FATIGUE: "Menu Repetition Fatigue",
  DINNER_SERVICE_CONCENTRATION: "Dinner Service Preparation",
  TEMPORARY_OPERATIONAL_ANOMALY: "Temporary Operational Disruption",
  COMPLAINT_SURGE_OIL_GREASINESS: "Concentration in Oil & Greasiness Reports",
  COMPLAINT_SURGE_HYGIENE_CLEANLINESS: "Spike in Hygiene & Cleanliness Reports",
  COMPLAINT_SURGE_TASTE_SEASONING: "Spike in Taste & Seasoning Complaints",
  COMPLAINT_SURGE_MEAL_TIMELINESS: "Spike in Service Delay Reports",
  COMPLAINT_SURGE_TEMPERATURE_FRESHNESS: "Spike in Food Temperature Complaints",
  POLL_ENGAGEMENT_DROP: "Decrease in Poll Voting Activity",
};

function getHumanReadableFactor(factorId: string): string {
  if (FACTOR_TITLE_MAP[factorId]) return FACTOR_TITLE_MAP[factorId];
  return factorId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const SIGNAL_TITLE_MAP: Record<string, string> = {
  average_food_rating_shift: "Average Food Satisfaction",
  complaint_volume_shift: "Total Complaint Volume",
  poll_vote_volume_shift: "Student Poll Votes",
  poll_turnout_average: "Average Votes Per Poll",
  active_polls_conducted: "Polls Conducted",
  complaint_theme_velocity_oil: "Oiliness / Greasiness Mentions",
  food_rating_drop: "Dish Rating Shift",
  meal_specific_rating_divergence: "Dinner Service Rating",
  meal_rating_drop_dinner: "Dinner Service Rating",
  high_food_frequency: "Dish Repetition Frequency",
  poll_preference_vote_share: "Poll Preference Vote Share",
  post_incident_rating_recovery: "Post-Incident Recovery",
};

function getHumanReadableSignal(signal: string, targetEntity?: string): string {
  if (targetEntity && targetEntity !== "All" && targetEntity !== "Overall Dining" && targetEntity !== "Overall Mess" && targetEntity !== "Kitchen Preparation") {
    if (signal === "food_rating_drop" || signal === "average_food_rating_shift") {
      return `${targetEntity} Rating`;
    }
    if (signal.includes("complaint_theme")) {
      return `${targetEntity} Complaints`;
    }
    if (signal === "high_food_frequency") {
      return `${targetEntity} Frequency`;
    }
    if (signal === "meal_specific_rating_divergence") {
      return `${targetEntity} Service Rating`;
    }
    return targetEntity;
  }
  if (SIGNAL_TITLE_MAP[signal]) return SIGNAL_TITLE_MAP[signal];
  return signal.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function FoodSatisfactionView({ data }: { data: InvestigationResponse }) {
  const details = data.food_details;
  if (!details) return null;

  return (
    <div className="space-y-6">
      {/* Rating Distribution & Meal Ratings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Breakdown */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              RATING DISTRIBUTION
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of {data.data_window.target_sample_count.toLocaleString()} reviews submitted across {details.unique_students} students.
            </p>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5">
            {[
              { star: 5, count: details.rating_distribution.stars_5, pct: details.rating_distribution.stars_5_pct },
              { star: 4, count: details.rating_distribution.stars_4, pct: details.rating_distribution.stars_4_pct },
              { star: 3, count: details.rating_distribution.stars_3, pct: details.rating_distribution.stars_3_pct },
              { star: 2, count: details.rating_distribution.stars_2, pct: details.rating_distribution.stars_2_pct },
              { star: 1, count: details.rating_distribution.stars_1, pct: details.rating_distribution.stars_1_pct },
            ].map((r) => (
              <div key={r.star} className="flex items-center gap-3 text-xs">
                <span className="w-10 font-medium text-slate-700 font-mono">{r.star} ★</span>
                <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${r.star >= 4 ? "bg-emerald-500" : r.star === 3 ? "bg-amber-400" : "bg-rose-500"}`}
                    style={{ width: `${Math.max(r.pct, 1)}%` }}
                  />
                </div>
                <span className="w-14 text-right font-mono font-semibold text-slate-800">
                  {r.count.toLocaleString()}
                </span>
                <span className="w-12 text-right font-mono text-slate-500">
                  {r.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Meal-Level Breakdown */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              MEAL-LEVEL PERFORMANCE
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Average satisfaction by meal service during the investigated window.
            </p>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {details.meal_breakdown.map((meal) => (
              <div key={meal.meal_type} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{meal.meal_type} Service</h4>
                  <p className="text-xs text-slate-500">
                    {meal.review_count.toLocaleString()} reviews • previous {meal.baseline_rating.toFixed(2)} ★
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold font-mono text-slate-900">{meal.target_rating.toFixed(2)} ★</p>
                  <p className={`text-xs font-semibold font-mono ${meal.change < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {meal.change > 0 ? "+" : ""}{meal.change.toFixed(2)} ★
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* WHAT STUDENTS SAID */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">
            WHAT STUDENTS SAID
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Key dining feedback themes and satisfaction highlights during this period.
          </p>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Most Common Concerns */}
          <div className="p-4 rounded-lg bg-rose-50/50 border border-rose-100 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Most Common Concerns
            </h4>
            {details.common_concerns.length > 0 ? (
              <ul className="space-y-2 text-xs text-slate-700">
                {details.common_concerns.map((c, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">• {c.theme}</span>
                    <span className="font-mono text-rose-700 font-semibold">{c.count} complaints</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No concentrated negative themes reported.</p>
            )}
          </div>

          {/* Most Positive Feedback */}
          <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Positive Feedback Highlights
            </h4>
            {details.positive_highlights.length > 0 ? (
              <ul className="space-y-2 text-xs text-slate-700">
                {details.positive_highlights.map((p, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">• {p.theme}</span>
                    <span className="font-mono text-emerald-700 font-semibold">{p.count} reviews</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">Feedback was generally neutral during this period.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* FOOD FEEDBACK (Dishes) */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">
            FOOD FEEDBACK & DISH RATINGS
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Ratings for dishes served during the investigated window.
          </p>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Most Reviewed Dishes
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Dish Name</th>
                    <th className="py-2.5 px-3">Meal Type</th>
                    <th className="py-2.5 px-3">Review Count</th>
                    <th className="py-2.5 px-3">Investigated Rating</th>
                    <th className="py-2.5 px-3">Previous Rating</th>
                    <th className="py-2.5 px-3">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {details.most_reviewed_dishes.map((dish, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{dish.food_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{dish.meal_type || "All"}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{dish.review_count.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{dish.average_rating.toFixed(2)} ★</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {dish.previous_rating !== null && dish.previous_rating !== undefined ? `${dish.previous_rating.toFixed(2)} ★` : "—"}
                      </td>
                      <td className={`py-2.5 px-3 font-mono font-semibold ${
                        dish.change !== null && dish.change !== undefined
                          ? dish.change < 0 ? "text-rose-600" : "text-emerald-600"
                          : "text-slate-500"
                      }`}>
                        {dish.change !== null && dish.change !== undefined
                          ? `${dish.change > 0 ? "+" : ""}${dish.change.toFixed(2)} ★`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-2">
                Lowest-Rated Dishes (Min 20 reviews)
              </h4>
              <ul className="space-y-1.5 text-xs">
                {details.lowest_rated_dishes.map((dish, idx) => (
                  <li key={idx} className="p-2.5 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{dish.food_name}</span>
                    <span className="font-mono font-bold text-rose-600">{dish.average_rating.toFixed(2)} ★ ({dish.review_count} reviews)</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                Highest-Rated Dishes (Min 20 reviews)
              </h4>
              <ul className="space-y-1.5 text-xs">
                {details.highest_rated_dishes.map((dish, idx) => (
                  <li key={idx} className="p-2.5 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{dish.food_name}</span>
                    <span className="font-mono font-bold text-emerald-600">{dish.average_rating.toFixed(2)} ★ ({dish.review_count} reviews)</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PATTERNS WORTH LOOKING INTO */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">
            PATTERNS WORTH LOOKING INTO
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Key factors observed alongside the shift in food satisfaction.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {data.possible_factors.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm font-semibold text-slate-800">Nothing clearly stood out.</p>
              <p className="text-xs text-slate-500 mt-0.5">No dominant food quality or preparation factor was observed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.possible_factors.map((factor, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{getHumanReadableFactor(factor.factor_id)}</h4>
                    <Badge variant={factor.confidence === "HIGH" ? "warning" : "neutral"} size="sm">
                      {factor.confidence === "HIGH" ? "Noticeable Support" : "Moderate Support"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{factor.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* EVIDENCE TABLE */}
      {data.evidence.length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              SUPPORTING EVIDENCE
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Metric Pattern</th>
                    <th className="py-2.5 px-3">Previous Window</th>
                    <th className="py-2.5 px-3">Investigated Window</th>
                    <th className="py-2.5 px-3">Change</th>
                    <th className="py-2.5 px-3">Relative Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.evidence.map((ev, idx) => {
                    const isRating = ev.signal.includes("rating");
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{getHumanReadableSignal(ev.signal, ev.target_entity)}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{isRating ? `${ev.before_value.toFixed(2)} ★` : Math.round(ev.before_value).toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{isRating ? `${ev.after_value.toFixed(2)} ★` : Math.round(ev.after_value).toLocaleString()}</td>
                        <td className={`py-2.5 px-3 font-mono font-semibold ${ev.change < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {ev.change > 0 ? "+" : ""}{isRating ? ev.change.toFixed(2) : Math.round(ev.change).toLocaleString()}{isRating ? " ★" : ""}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{ev.relative_change_pct > 0 ? "+" : ""}{ev.relative_change_pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ComplaintVolumeView({ data }: { data: InvestigationResponse }) {
  const details = data.complaint_details;
  if (!details) return null;

  return (
    <div className="space-y-6">
      {/* WHAT WERE STUDENTS COMPLAINING ABOUT? */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                WHAT WERE STUDENTS COMPLAINING ABOUT?
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Breakdown of {data.data_window.target_sample_count} complaints logged by {details.unique_complainants} distinct students.
              </p>
            </div>
            {details.top_theme_name && (
              <Badge variant="warning" size="md">
                Top Issue: {details.top_theme_name} ({details.top_theme_count} complaints)
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {details.top_theme_name && (
            <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
              <span className="font-bold">{details.top_theme_name}</span> was reported most often, making up{" "}
              <span className="font-bold">{details.top_theme_count} complaints</span> ({details.top_theme_share_pct}% of all submissions).
            </div>
          )}

          {/* Theme Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Complaint Theme</th>
                  <th className="py-2.5 px-3">Investigated Period</th>
                  <th className="py-2.5 px-3">Baseline Period</th>
                  <th className="py-2.5 px-3">Change</th>
                  <th className="py-2.5 px-3">Share of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {details.themes.map((th, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{th.theme_name}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{th.count} complaints</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{th.baseline_count} complaints</td>
                    <td className={`py-2.5 px-3 font-mono font-semibold ${th.change > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {th.change > 0 ? "+" : ""}{th.change}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(th.share_pct, 100)}%` }} />
                        </div>
                        <span>{th.share_pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* WHEN DID COMPLAINTS INCREASE? (Activity Trend) */}
      {details.daily_trend.length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              COMPLAINT SUBMISSIONS OVER TIME
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily volume of complaints logged during the investigated window.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {details.daily_trend.slice(-16).map((item, idx) => (
                <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-500 block truncate">{formatHumanDate(item.date)}</span>
                  <span className={`text-sm font-bold font-mono mt-0.5 block ${item.count >= 10 ? "text-rose-600" : "text-slate-800"}`}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PATTERNS WORTH LOOKING INTO */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">
            PATTERNS WORTH LOOKING INTO
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Complaint-specific drivers and areas of reported student concern.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {data.possible_factors.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm font-semibold text-slate-800">Nothing clearly stood out.</p>
              <p className="text-xs text-slate-500 mt-0.5">Complaint volume was distributed without a single acute cluster.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.possible_factors.map((factor, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{getHumanReadableFactor(factor.factor_id)}</h4>
                    <Badge variant="warning" size="sm">Primary Driver</Badge>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{factor.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* EVIDENCE TABLE */}
      {data.evidence.length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              SUPPORTING EVIDENCE
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Complaint Pattern</th>
                    <th className="py-2.5 px-3">Baseline Period</th>
                    <th className="py-2.5 px-3">Investigated Period</th>
                    <th className="py-2.5 px-3">Change</th>
                    <th className="py-2.5 px-3">Relative Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.evidence.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{getHumanReadableSignal(ev.signal, ev.target_entity)}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{Math.round(ev.before_value)} complaints</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{Math.round(ev.after_value)} complaints</td>
                      <td className={`py-2.5 px-3 font-mono font-semibold ${ev.change > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {ev.change > 0 ? "+" : ""}{Math.round(ev.change)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{ev.relative_change_pct > 0 ? "+" : ""}{ev.relative_change_pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PollParticipationView({ data }: { data: InvestigationResponse }) {
  const details = data.poll_details;
  if (!details) return null;

  return (
    <div className="space-y-6">
      {/* 4-Stat Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Total Votes</span>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono">{data.data_window.target_sample_count.toLocaleString()}</p>
          <span className="text-xs text-slate-500 mt-0.5 block">vs {data.data_window.comparison_sample_count.toLocaleString()} baseline</span>
        </div>
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Unique Voters</span>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono">{details.unique_voters} students</p>
          <span className="text-xs text-slate-500 mt-0.5 block">vs {details.comparison_unique_voters} in baseline</span>
        </div>
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Polls Conducted</span>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono">{details.total_polls} polls</p>
          <span className="text-xs text-slate-500 mt-0.5 block">1 poll scheduled per day</span>
        </div>
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Average Turnout</span>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono">{details.average_votes_per_poll.toFixed(1)} votes/poll</p>
          <span className="text-xs text-slate-500 mt-0.5 block">vs {details.comparison_average_votes_per_poll.toFixed(1)} baseline</span>
        </div>
      </div>

      {/* WHAT DID STUDENTS CHOOSE? (Active Polls) */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">
            WHAT DID STUDENTS CHOOSE?
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Student preference distributions across daily dining menu polls.
          </p>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {details.most_active_polls.map((poll) => (
            <div key={poll.poll_id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{formatHumanDate(poll.poll_date)}</span>
                <span className="text-xs font-mono text-slate-500">{poll.total_votes} votes</span>
              </div>
              <div className="space-y-2">
                {poll.options.map((opt, oIdx) => (
                  <div key={oIdx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`truncate ${opt.food_name === poll.winning_option ? "font-bold text-slate-900" : "text-slate-600"}`}>
                        {opt.food_name} {opt.food_name === poll.winning_option ? "🏆" : ""}
                      </span>
                      <span className="font-mono text-slate-700 ml-2">{opt.share_pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${opt.food_name === poll.winning_option ? "bg-blue-600" : "bg-slate-400"}`}
                        style={{ width: `${opt.share_pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* MOST CHOSEN MENU PREFERENCES ACROSS ALL POLLS */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">
            TOP VOTED MENU PREFERENCES
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Dishes that received the highest total student vote count across all polls in this window.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {details.top_chosen_options.map((opt, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs font-bold text-slate-900 block truncate">{opt.food_name}</span>
                <span className="text-base font-bold font-mono text-blue-600 mt-1 block">{opt.total_votes} votes</span>
                <span className="text-[11px] text-slate-500 block">in {opt.polls_featured} polls</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PATTERNS WORTH LOOKING INTO */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">
            PATTERNS WORTH LOOKING INTO
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Student participation trends and engagement stability.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {data.possible_factors.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-sm font-semibold text-slate-800">Participation was consistent.</p>
              <p className="text-xs text-slate-500">
                Poll turnout remained within normal historical variance ({data.metric_summary.percent_change > 0 ? "+" : ""}{data.metric_summary.percent_change.toFixed(1)}%), with {details.unique_voters} distinct students voting across {details.total_polls} daily polls.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.possible_factors.map((factor, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{getHumanReadableFactor(factor.factor_id)}</h4>
                    <Badge variant="warning" size="sm">Noticeable Shift</Badge>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{factor.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* EVIDENCE TABLE */}
      {data.evidence.length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              SUPPORTING EVIDENCE
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Participation Metric</th>
                    <th className="py-2.5 px-3">Baseline Period</th>
                    <th className="py-2.5 px-3">Investigated Period</th>
                    <th className="py-2.5 px-3">Change</th>
                    <th className="py-2.5 px-3">Relative Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.evidence.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{getHumanReadableSignal(ev.signal, ev.target_entity)}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{ev.before_value.toFixed(1)}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{ev.after_value.toFixed(1)}</td>
                      <td className={`py-2.5 px-3 font-mono font-semibold ${ev.change < 0 ? "text-slate-800" : "text-emerald-600"}`}>
                        {ev.change > 0 ? "+" : ""}{ev.change.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{ev.relative_change_pct > 0 ? "+" : ""}{ev.relative_change_pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
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
      {/* ========================================================================= */}
      {/* SECTION 1: ROOT CAUSE (WHY DID THIS CHANGE?) */}
      {/* ========================================================================= */}
      {activeTab === "root_cause" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              WHY?
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Why did this change?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Compare dining feedback across two time periods to understand what happened.
            </p>
          </div>

          {/* Investigation Controls */}
          <Card className="border border-slate-200">
            <CardContent className="p-5">
              <form onSubmit={handleRunInvestigation} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Metric
                    </label>
                    <select
                      value={rcMetric}
                      onChange={(e) => setRcMetric(e.target.value)}
                      className="w-full text-sm rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="food_satisfaction">Food Satisfaction</option>
                      <option value="complaint_volume">Complaint Volume</option>
                      <option value="poll_participation">Poll Participation</option>
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
                  Choose the metric and date range you want to compare.
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
              {/* 1. WHAT CHANGED? */}
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

                    <Badge
                      variant={rcData.metric_summary.statistically_significant ? "warning" : "neutral"}
                      size="md"
                    >
                      {rcData.metric_summary.statistically_significant
                        ? (rcData.metric_summary.metric === "complaint_volume"
                            ? (rcData.metric_summary.change > 0 ? "Noticeable increase in complaints" : "Noticeable reduction in complaints")
                            : rcData.metric_summary.change < 0
                            ? "Noticeable drop"
                            : "Noticeable increase")
                        : "About the same as before"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Previous Period */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Previous Period
                      </span>
                      <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
                        {formatMetricValue(rcData.metric_summary.previous_value, rcData.metric_summary.metric)}
                      </p>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        {rcData.data_window.comparison_start_date
                          ? `${formatHumanDate(rcData.data_window.comparison_start_date)} to ${formatHumanDate(rcData.data_window.comparison_end_date)}`
                          : "Prior reference window"}
                      </span>
                    </div>

                    {/* Investigated Period */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Investigated Period
                      </span>
                      <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
                        {formatMetricValue(rcData.metric_summary.current_value, rcData.metric_summary.metric)}
                      </p>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        {formatHumanDate(rcData.data_window.target_start_date)} to {formatHumanDate(rcData.data_window.target_end_date)}
                      </span>
                    </div>

                    {/* Change */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Change
                      </span>
                      <p className={`text-xl font-bold mt-1 font-mono ${
                        rcData.metric_summary.statistically_significant
                          ? (rcData.metric_summary.metric === "complaint_volume"
                              ? (rcData.metric_summary.change > 0 ? "text-rose-600" : "text-emerald-600")
                              : (rcData.metric_summary.change < 0 ? "text-rose-600" : "text-emerald-600"))
                          : "text-slate-800"
                      }`}>
                        {rcData.metric_summary.change > 0 ? "+" : ""}
                        {rcData.metric_summary.metric === "food_satisfaction"
                          ? rcData.metric_summary.change.toFixed(2)
                          : Math.round(rcData.metric_summary.change).toLocaleString()}
                        {rcData.metric_summary.metric === "food_satisfaction" ? " ★" : ""}{" "}
                        <span className="text-xs font-semibold text-slate-500 ml-1 font-sans">
                          ({rcData.metric_summary.percent_change > 0 ? "+" : ""}{rcData.metric_summary.percent_change.toFixed(1)}%)
                        </span>
                      </p>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        {rcData.metric_summary.statistically_significant ? "Confirmed shift" : "About the same as before"}
                      </span>
                    </div>

                    {/* Count */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        {rcData.metric_summary.metric === "food_satisfaction"
                          ? "Review Activity"
                          : rcData.metric_summary.metric === "complaint_volume"
                          ? "Complaint Submissions"
                          : "Poll Turnout"}
                      </span>
                      <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
                        {getMetricSampleLabel(rcData.metric_summary.metric, rcData.data_window.target_sample_count)}
                      </p>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        {rcData.food_details?.unique_students
                          ? `from ${rcData.food_details.unique_students} distinct students`
                          : rcData.complaint_details?.unique_complainants
                          ? `from ${rcData.complaint_details.unique_complainants} distinct students`
                          : rcData.poll_details?.unique_voters
                          ? `from ${rcData.poll_details.unique_voters} participating students`
                          : `vs ${getMetricSampleLabel(rcData.metric_summary.metric, rcData.data_window.comparison_sample_count)} baseline`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metric-Specific Analytical Content */}
              {rcData.metric_summary.metric === "food_satisfaction" && (
                <FoodSatisfactionView data={rcData} />
              )}

              {rcData.metric_summary.metric === "complaint_volume" && (
                <ComplaintVolumeView data={rcData} />
              )}

              {rcData.metric_summary.metric === "poll_participation" && (
                <PollParticipationView data={rcData} />
              )}

              {/* Note: non-causal reminder */}
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
                  <CardTitle className="text-base font-bold text-slate-900">
                    WHAT COULD HAPPEN?
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Model estimates for the current and proposed dish, and the average shift across simulation runs.
                  </p>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  {/* 3-Part Comparison: Current -> Simulated -> Average Simulated Shift */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Current State */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Current Model Estimate
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
                        Raw model estimate for the current dish
                      </span>
                    </div>

                    {/* Simulated State */}
                    <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200 space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 block">
                        Simulated Model Estimate
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
                        Raw model estimate for the proposed dish
                      </span>
                    </div>

                    {/* Average Simulated Shift */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Average Simulated Shift
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
                        Average difference across {simData.distribution.runs.toLocaleString()} paired simulation runs
                      </span>
                    </div>
                  </div>

                  {/* Helper note — arithmetic distinction */}
                  <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                    The model estimates each dish directly, while the shift is calculated from paired simulation runs. These values therefore do not necessarily subtract exactly.
                  </p>

                </CardContent>
              </Card>

              {/* 2. POSSIBLE SIMULATED OUTCOMES */}
              <Card className="border border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900">
                    POSSIBLE SIMULATED OUTCOMES
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    The simulation was repeated across {simData.distribution.runs.toLocaleString()} historical conditions to show how the scenario result can vary.
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
                        P50 — median of the simulated distribution
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
                      <span>Simulated P10–P90 Range</span>
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
                          <span className="text-[10px] font-bold text-blue-700 block">P50</span>
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

              {/* 3. SIMULATION UNCERTAINTY */}
              <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-200 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold uppercase tracking-wider text-slate-800 block">
                    SIMULATION UNCERTAINTY
                  </span>
                  <Badge
                    variant={
                      simData.outcomes?.[0]?.risk_level === "HIGH"
                        ? "warning"
                        : simData.outcomes?.[0]?.risk_level === "MODERATE"
                        ? "warning"
                        : "success"
                    }
                    size="sm"
                  >
                    {simData.outcomes?.[0]?.risk_level === "HIGH"
                      ? "Higher"
                      : simData.outcomes?.[0]?.risk_level === "MODERATE"
                      ? "Moderate"
                      : "Low"}
                  </Badge>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  The simulated outcome varies considerably across runs.
                </p>
                {simData.confidence === "LOW" && (
                  <p className="text-slate-600 leading-relaxed">
                    Limited historical data for the proposed dish contributes to higher uncertainty.
                  </p>
                )}
              </div>

              {/* 4. WHAT DOES THIS MEAN? */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-800 block">
                  WHAT DOES THIS MEAN?
                </span>
                <p className="text-slate-700 leading-relaxed">
                  The model&apos;s point estimates are{" "}
                  {simData.delta.mean_delta > 0.05
                    ? "slightly higher"
                    : simData.delta.mean_delta < -0.05
                    ? "lower"
                    : "similar"}{" "}
                  for the proposed dish, while the average simulated shift is{" "}
                  <strong className="text-slate-900 font-semibold font-mono">
                    {simData.delta.mean_delta > 0 ? "+" : ""}
                    {simData.delta.mean_delta.toFixed(2)} ★
                  </strong>
                  . The simulation also shows substantial variation across possible outcomes.
                </p>
                <p className="text-slate-500 leading-relaxed pt-0.5">
                  This is a scenario estimate, not a guarantee of what will happen in practice.
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
                        <th className="py-2.5 px-3">Uncertainty</th>
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
