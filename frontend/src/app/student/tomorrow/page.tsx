"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { studentApi } from "@/lib/student";
import { formatErrorMessage } from "@/lib/error";
import { TomorrowMenuResponse } from "@/types/student";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function TomorrowMenuPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<TomorrowMenuResponse | null>(null);

  const fetchTomorrowMenu = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentApi.getTomorrowMenu();
      setMenuData(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load tomorrow's menu"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTomorrowMenu();
  }, [fetchTomorrowMenu]);

  const tomorrowFormatted = useMemo(() => {
    if (menuData?.date) {
      try {
        return new Date(menuData.date).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      } catch {
        return menuData.date;
      }
    }
    return new Date(Date.now() + 86400000).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [menuData?.date]);

  if (loading) {
    return (
      <div className="min-h-[55vh] flex items-center justify-center">
        <Loading size="lg" text="Loading tomorrow's menu..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchTomorrowMenu} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Tomorrow's Menu"
        description="Check what's planned for your next meal."
        action={
          <div className="flex items-center gap-2">
            <Link href="/student/dashboard">
              <Button variant="ghost" size="sm" className="text-xs">
                &larr; Dashboard
              </Button>
            </Link>
          </div>
        }
      />

      {/* Edge Case: Menu is not yet published */}
      {!menuData?.published || !menuData.food ? (
        <EmptyState
          title="Tomorrow's menu isn't published yet"
          description="The mess administration has not published tomorrow's dining schedule yet. Once the kitchen finalizes tomorrow's meal choices, the menu will appear here."
          actionText="View Tomorrow's Food Poll"
          onAction={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/student/poll";
            }
          }}
          className="border-slate-200"
        />
      ) : (
        /* Published Menu Card */
        <Card className="border-slate-200/90 shadow-xs">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                    {menuData.food.mealType || "Scheduled Meal"}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Dish #{menuData.food.id}
                  </span>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight pt-1">
                  {menuData.food.name}
                </CardTitle>
              </div>

              <div className="shrink-0">
                <Badge variant="success" dot={true}>
                  Kitchen Confirmed
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Operational Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 text-sm">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Scheduled Date
                </span>
                <p className="font-semibold text-slate-900">{tomorrowFormatted}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Dining Slot
                </span>
                <p className="font-semibold text-slate-900">
                  {menuData.food.mealType || "Standard Dining"}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Preparation Status
                </span>
                <p className="font-medium text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Approved by Mess Committee</span>
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Student Feedback Window
                </span>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Rating opens upon meal service tomorrow
                </p>
              </div>
            </div>

            {/* Helpful Notice */}
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
                Tomorrow&apos;s menu has been confirmed from daily polling results and kitchen inventory. You will be able to submit quality feedback once serving begins.
              </p>
            </div>

            {/* Navigation Controls */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <Link href="/student/dashboard" className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  &larr; Return to Dashboard
                </Button>
              </Link>
              <Link href="/student/poll" className="w-full sm:w-auto">
                <Button variant="ghost" size="sm" className="w-full sm:w-auto text-slate-600">
                  View Daily Poll &rarr;
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
