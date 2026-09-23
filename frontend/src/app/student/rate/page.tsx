"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { studentApi } from "@/lib/student";
import { formatErrorMessage } from "@/lib/error";
import { TodayMenuResponse } from "@/types/student";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { StarRating } from "@/components/student/StarRating";

export default function RateFoodPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingData, setRatingData] = useState<TodayMenuResponse | null>(null);

  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchRatingInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentApi.getTodayRatingInfo();
      setRatingData(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load today's rating details"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRatingInfo();
  }, [fetchRatingInfo]);

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingData?.food) return;

    if (selectedRating < 1 || selectedRating > 5) {
      setSubmitError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await studentApi.submitRating({
        foodId: ratingData.food.id,
        rating: selectedRating,
      });

      setSubmitSuccess(response.message || "Thank you! Your rating has been recorded.");
      setRatingData({
        ...ratingData,
        alreadyRated: true,
      });
    } catch (err) {
      setSubmitError(
        formatErrorMessage(
          err,
          "Failed to submit rating. You may have already submitted today."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const ratingLabel = useMemo(() => {
    switch (selectedRating) {
      case 1:
        return { text: "1 Star — Poor", desc: "Needs significant improvement" };
      case 2:
        return { text: "2 Stars — Below Average", desc: "Fair, but shortcomings noticed" };
      case 3:
        return { text: "3 Stars — Average", desc: "Acceptable standard mess meal" };
      case 4:
        return { text: "4 Stars — Good", desc: "Tasty, well-prepared meal" };
      case 5:
        return { text: "5 Stars — Excellent", desc: "Outstanding quality and flavor" };
      default:
        return { text: "Select a rating (1 - 5 stars)", desc: "Click or tap a star to evaluate today's food" };
    }
  }, [selectedRating]);

  if (loading) {
    return (
      <div className="min-h-[55vh] flex items-center justify-center">
        <Loading size="lg" text="Loading today's meal for rating..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchRatingInfo} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Rate Today's Food"
        description="Share your feedback to help improve the mess menu."
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">{todayFormatted}</span>
            <Link href="/student/dashboard">
              <Button variant="ghost" size="sm" className="text-xs">
                &larr; Dashboard
              </Button>
            </Link>
          </div>
        }
      />

      {/* Success Notification Alert */}
      {submitSuccess && (
        <Alert
          variant="success"
          title="Rating Submitted"
          onClose={() => setSubmitSuccess(null)}
        >
          {submitSuccess}
        </Alert>
      )}

      {/* Error Notification Alert */}
      {submitError && (
        <Alert
          variant="danger"
          title="Submission Failed"
          onClose={() => setSubmitError(null)}
        >
          {submitError}
        </Alert>
      )}

      {/* Edge Case: No food scheduled or served today */}
      {!ratingData?.served || !ratingData?.food ? (
        <EmptyState
          title="No food available to rate"
          description="There is currently no meal scheduled or marked as served for today. Once the kitchen staff marks the meal as served, student ratings will open."
          actionText="Return to Dashboard"
          onAction={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/student/dashboard";
            }
          }}
          className="border-slate-200"
        />
      ) : (
        /* Food Rating Card */
        <Card className="border-slate-200/90 shadow-xs">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                    {ratingData.food.mealType || "Today's Meal"}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Dish #{ratingData.food.id}
                  </span>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight pt-1">
                  {ratingData.food.name}
                </CardTitle>
              </div>

              <div className="shrink-0">
                {ratingData.alreadyRated ? (
                  <Badge variant="success" dot={true}>
                    Already Rated
                  </Badge>
                ) : (
                  <Badge variant="default" dot={true}>
                    Awaiting Rating
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {ratingData.alreadyRated ? (
              /* Already Rated State */
              <div className="text-center py-6 sm:py-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center mx-auto">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-semibold text-slate-900">
                    Your rating has been submitted
                  </h4>
                  <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    Thank you for reviewing <span className="font-medium text-slate-800">{ratingData.food.name}</span>.
                    To preserve polling and assessment integrity, each student is allocated one rating per daily meal session.
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/student/dashboard" className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      &larr; Return to Dashboard
                    </Button>
                  </Link>
                  <Link href="/student/tomorrow" className="w-full sm:w-auto">
                    <Button variant="ghost" size="sm" className="w-full sm:w-auto text-slate-600">
                      View Tomorrow&apos;s Menu &rarr;
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* Rating Submission Form */
              <form onSubmit={handleSubmitRating} className="space-y-6">
                <div className="text-center py-6 px-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                  <label
                    id="star-rating-label"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Select Your Rating
                  </label>

                  <div className="flex justify-center py-1">
                    <StarRating
                      value={selectedRating}
                      onChange={(r) => setSelectedRating(r)}
                      size="lg"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <p
                      className={`text-sm font-semibold transition-colors ${
                        selectedRating > 0 ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {ratingLabel.text}
                    </p>
                    <p className="text-xs text-slate-500">{ratingLabel.desc}</p>
                  </div>
                </div>

                {/* Helpful Context Note */}
                <div className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-100 flex items-start gap-3">
                  <svg
                    className="w-4 h-4 text-blue-600 mt-0.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Student reviews are aggregated anonymously to assist mess administration and kitchen staff in monitoring dish quality and consistency.
                  </p>
                </div>

                {/* Form Action Controls */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
                  <Link href="/student/dashboard" className="w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      type="button"
                      disabled={submitting}
                      className="w-full sm:w-auto text-slate-600"
                    >
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={submitting || selectedRating === 0}
                    className="w-full sm:w-auto"
                  >
                    {submitting ? "Submitting..." : "Submit Rating"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
