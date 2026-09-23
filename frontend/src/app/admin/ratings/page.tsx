"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin";
import { formatErrorMessage } from "@/lib/error";
import { FoodAnalyticsResponse } from "@/types/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { StarRating } from "@/components/student/StarRating";

export default function AdminRatingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<FoodAnalyticsResponse[]>([]);

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getRatings();
      setRatings(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load food rating analytics"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" text="Analyzing dining satisfaction metrics..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchRatings} />;
  }

  // Summary stats
  const totalReviewsAll = ratings.reduce((sum, item) => sum + item.totalReviews, 0);
  const itemsWithReviews = ratings.filter((r) => r.totalReviews > 0);
  const overallAvg =
    itemsWithReviews.length > 0
      ? Math.round(
          (itemsWithReviews.reduce((sum, r) => sum + r.averageRating, 0) /
            itemsWithReviews.length) *
            10.0
        ) / 10.0
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Food Rating Analytics"
        description="Inspect student satisfaction scores, review counts, and quality trends across all mess dining items."
        action={
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={fetchRatings}>
              Refresh Scores
            </Button>
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard &rarr;
              </Button>
            </Link>
          </div>
        }
      />

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-gray-200">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Food Items Monitored
            </p>
            <p className="text-2xl font-bold text-gray-900">{ratings.length}</p>
            <p className="text-xs text-gray-400">Items in mess catalogue</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Student Reviews
            </p>
            <p className="text-2xl font-bold text-gray-900">{totalReviewsAll}</p>
            <p className="text-xs text-gray-400">Recorded dining evaluations</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Mess Quality Average
            </p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold text-gray-900">
                {overallAvg > 0 ? `${overallAvg} / 5.0` : "N/A"}
              </p>
              {overallAvg >= 4.0 ? (
                <Badge variant="success">High Satisfaction</Badge>
              ) : overallAvg >= 3.0 ? (
                <Badge variant="default">Average</Badge>
              ) : overallAvg > 0 ? (
                <Badge variant="warning">Needs Attention</Badge>
              ) : null}
            </div>
            <p className="text-xs text-gray-400">Calculated across reviewed foods</p>
          </CardContent>
        </Card>
      </div>

      {ratings.length === 0 ? (
        <EmptyState
          title="No Food Rating Data"
          description="There are currently no food review records recorded in the mess database."
        />
      ) : (
        <Card className="border border-gray-200 shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-6 bg-gray-50 border-b border-gray-200 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Itemized Dining Feedback Log
            </CardTitle>
            <span className="text-xs text-gray-500 font-mono">
              {ratings.length} Food Item{ratings.length !== 1 ? "s" : ""}
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50/70 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Food Item</th>
                  <th className="px-6 py-3">Average Score</th>
                  <th className="px-6 py-3">Star Rating</th>
                  <th className="px-6 py-3">Review Count</th>
                  <th className="px-6 py-3 text-right">Performance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {ratings.map((item) => (
                  <tr key={item.foodName} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {item.foodName}
                    </td>
                    <td className="px-6 py-4">
                      {item.totalReviews > 0 ? (
                        <span className="font-bold text-gray-900">
                          {item.averageRating.toFixed(1)}{" "}
                          <span className="text-xs font-normal text-gray-500">/ 5.0</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No reviews</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.totalReviews > 0 ? (
                        <StarRating
                          value={Math.round(item.averageRating)}
                          disabled
                          size="sm"
                        />
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      <strong>{item.totalReviews}</strong> review{item.totalReviews !== 1 ? "s" : ""}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.totalReviews === 0 ? (
                        <Badge variant="neutral">Unrated</Badge>
                      ) : item.averageRating >= 4.0 ? (
                        <Badge variant="success">Popular / High</Badge>
                      ) : item.averageRating >= 3.0 ? (
                        <Badge variant="default">Satisfactory</Badge>
                      ) : (
                        <Badge variant="warning">Needs Improvement</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
