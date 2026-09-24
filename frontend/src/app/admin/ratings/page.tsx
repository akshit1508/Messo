"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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

type SortOption = "RATING_DESC" | "RATING_ASC" | "REVIEWS_DESC" | "NAME_ASC";

export default function AdminRatingsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<FoodAnalyticsResponse[]>([]);

  // Search & sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("RATING_DESC");

  const fetchRatings = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await adminApi.getRatings();
      setRatings(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load food rating analytics"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  // Summary stats
  const totalReviewsAll = useMemo(
    () => ratings.reduce((sum, item) => sum + item.totalReviews, 0),
    [ratings]
  );
  const itemsWithReviews = useMemo(
    () => ratings.filter((r) => r.totalReviews > 0),
    [ratings]
  );
  const overallAvg = useMemo(() => {
    if (itemsWithReviews.length === 0) return 0;
    const sum = itemsWithReviews.reduce((acc, r) => acc + r.averageRating, 0);
    return Math.round((sum / itemsWithReviews.length) * 10) / 10;
  }, [itemsWithReviews]);

  // Filtered & Sorted
  const filteredRatings = useMemo(() => {
    let result = ratings.filter((item) => {
      if (!searchQuery.trim()) return true;
      return item.foodName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    result.sort((a, b) => {
      if (sortBy === "RATING_DESC") {
        if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
        return b.totalReviews - a.totalReviews;
      }
      if (sortBy === "RATING_ASC") {
        return a.averageRating - b.averageRating;
      }
      if (sortBy === "REVIEWS_DESC") {
        if (b.totalReviews !== a.totalReviews) return b.totalReviews - a.totalReviews;
        return b.averageRating - a.averageRating;
      }
      if (sortBy === "NAME_ASC") {
        return a.foodName.localeCompare(b.foodName);
      }
      return 0;
    });

    return result;
  }, [ratings, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" text="Analyzing dining satisfaction metrics..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => fetchRatings()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Food Rating Analytics"
        description="Inspect student satisfaction scores, review volume, and culinary quality trends across all mess dining items."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRatings(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Refreshing…
                </span>
              ) : (
                "Refresh Scores"
              )}
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
        <Card className="border border-slate-200/90 shadow-xs">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Menu Items Monitored
              </p>
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{ratings.length}</p>
            <p className="text-xs text-slate-400">Items recorded in mess catalogue</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 shadow-xs">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Student Reviews
              </p>
              <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalReviewsAll}</p>
            <p className="text-xs text-slate-400">Total authenticated ratings logged</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 shadow-xs">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mess Quality Average
              </p>
              <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-slate-900">
                {overallAvg > 0 ? `${overallAvg.toFixed(1)} / 5.0` : "N/A"}
              </p>
              {overallAvg >= 4.0 ? (
                <Badge variant="success">High</Badge>
              ) : overallAvg >= 3.0 ? (
                <Badge variant="default">Satisfactory</Badge>
              ) : overallAvg > 0 ? (
                <Badge variant="warning">Attention</Badge>
              ) : null}
            </div>
            <p className="text-xs text-slate-400">
              Across {itemsWithReviews.length} evaluated dish{itemsWithReviews.length !== 1 ? "es" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: Search & Sort */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meal item name…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 pl-9 text-xs text-slate-900 placeholder-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-slate-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="RATING_DESC">Highest Rated</option>
            <option value="RATING_ASC">Lowest Rated</option>
            <option value="REVIEWS_DESC">Most Reviewed</option>
            <option value="NAME_ASC">Dish Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Ratings Table / Empty State */}
      {filteredRatings.length === 0 ? (
        <EmptyState
          title={searchQuery ? "No Dishes Found" : "No Food Rating Data"}
          description={
            searchQuery
              ? `No food item matches "${searchQuery}". Try a different search keyword.`
              : "There are currently no food review records recorded in the mess database."
          }
          actionText={searchQuery ? "Clear Search" : undefined}
          onAction={searchQuery ? () => setSearchQuery("") : undefined}
        />
      ) : (
        <Card className="border border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-6 bg-slate-50/80 border-b border-slate-200 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800">
              Itemized Dining Feedback Log
            </CardTitle>
            <span className="text-xs text-slate-500 font-mono">
              {filteredRatings.length} Food Item{filteredRatings.length !== 1 ? "s" : ""}
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Food Item</th>
                  <th className="px-5 py-3.5">Average Score</th>
                  <th className="px-5 py-3.5">Star Rating</th>
                  <th className="px-5 py-3.5">Review Volume</th>
                  <th className="px-5 py-3.5 text-right">Performance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRatings.map((item) => {
                  const scorePercent = (item.averageRating / 5.0) * 100;

                  return (
                    <tr key={item.foodName} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 text-sm">
                          {item.foodName}
                        </div>
                      </td>

                      {/* Average Score & Bar */}
                      <td className="px-5 py-4">
                        {item.totalReviews > 0 ? (
                          <div className="space-y-1.5 min-w-[120px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-900">
                                {item.averageRating.toFixed(1)}
                              </span>
                              <span className="text-xs text-slate-400">/ 5.0</span>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  item.averageRating >= 4.0
                                    ? "bg-emerald-500"
                                    : item.averageRating >= 3.0
                                    ? "bg-blue-500"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${scorePercent}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No reviews yet</span>
                        )}
                      </td>

                      {/* Star Rating Component */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {item.totalReviews > 0 ? (
                          <StarRating
                            value={Math.round(item.averageRating)}
                            disabled
                            size="sm"
                          />
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Review Count */}
                      <td className="px-5 py-4 text-xs text-slate-600 whitespace-nowrap">
                        <span className="font-semibold text-slate-900">{item.totalReviews}</span>{" "}
                        review{item.totalReviews !== 1 ? "s" : ""}
                      </td>

                      {/* Performance Status */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {item.totalReviews === 0 ? (
                          <Badge variant="neutral">Unrated</Badge>
                        ) : item.averageRating >= 4.0 ? (
                          <Badge variant="success" dot>Popular / High</Badge>
                        ) : item.averageRating >= 3.0 ? (
                          <Badge variant="default">Satisfactory</Badge>
                        ) : (
                          <Badge variant="warning" dot>Needs Attention</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
