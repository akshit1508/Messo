"use client";

import React, { useEffect, useState, useCallback } from "react";
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
      setSubmitError(formatErrorMessage(err, "Failed to submit rating. You may have already submitted today."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" text="Loading today's meal for rating..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchRatingInfo} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Rate Today's Meal"
        description="Share your feedback on today's food quality to help improve mess dining standards."
      />

      {submitSuccess && (
        <Alert
          variant="success"
          title="Rating Submitted"
          onClose={() => setSubmitSuccess(null)}
        >
          {submitSuccess}
        </Alert>
      )}

      {submitError && (
        <Alert
          variant="danger"
          title="Submission Failed"
          onClose={() => setSubmitError(null)}
        >
          {submitError}
        </Alert>
      )}

      {!ratingData?.served || !ratingData?.food ? (
        <EmptyState
          title="No Food Served Today"
          description="There is no food scheduled or served on today's menu to rate at this time."
          actionText="Back to Dashboard"
          onAction={() => {}}
        />
      ) : (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {ratingData.food.mealType || "Today's Meal"}
                </span>
                <CardTitle className="text-2xl font-bold text-gray-900 mt-2">
                  {ratingData.food.name}
                </CardTitle>
              </div>
              <Badge variant={ratingData.alreadyRated ? "success" : "default"}>
                {ratingData.alreadyRated ? "Already Rated" : "Awaiting Rating"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {ratingData.alreadyRated ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    You have already submitted a rating for today
                  </h4>
                  <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                    To maintain fairness and integrity, each student is allowed one rating per day.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/student/dashboard">
                    <Button variant="outline" size="sm">
                      &larr; Return to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitRating} className="space-y-6">
                <div className="text-center py-4 bg-gray-50/70 rounded-xl border border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tap to rate quality (1 - 5 stars)
                  </label>
                  <div className="flex justify-center">
                    <StarRating
                      value={selectedRating}
                      onChange={(r) => setSelectedRating(r)}
                      size="lg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-3 font-medium">
                    {selectedRating === 0 && "Select a score"}
                    {selectedRating === 1 && "1 Star - Poor / Needs major improvement"}
                    {selectedRating === 2 && "2 Stars - Below Average"}
                    {selectedRating === 3 && "3 Stars - Average / Acceptable"}
                    {selectedRating === 4 && "4 Stars - Good / Satisfying"}
                    {selectedRating === 5 && "5 Stars - Excellent / Loved it"}
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <Link href="/student/dashboard">
                    <Button variant="ghost" type="button" disabled={submitting}>
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={submitting || selectedRating === 0}
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
