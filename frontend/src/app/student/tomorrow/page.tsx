"use client";

import React, { useEffect, useState, useCallback } from "react";
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

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" text="Loading tomorrow's menu schedule..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchTomorrowMenu} />;
  }

  const tomorrowDateFormatted = menuData?.date
    ? new Date(menuData.date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : new Date(Date.now() + 86400000).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Tomorrow's Menu Schedule"
        description="Preview planned dining schedule for tomorrow based on finalized kitchen preparations."
      />

      {!menuData?.published || !menuData.food ? (
        <EmptyState
          title="Tomorrow's menu has not been published yet."
          description="The mess administration has not finalized tomorrow's dining schedule yet. If a poll is currently active, please vote so the kitchen team can finalize the plan!"
          actionText="Check Tomorrow's Poll"
          onAction={() => {
            window.location.href = "/student/poll";
          }}
        />
      ) : (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {menuData.food.mealType || "Scheduled Meal"}
                </span>
                <CardTitle className="text-2xl font-bold text-gray-900 mt-2">
                  {menuData.food.name}
                </CardTitle>
              </div>
              <Badge variant="success">Published Menu</Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-gray-50/70 p-4 rounded-xl border border-gray-100">
              <div>
                <span className="text-gray-500 font-medium">Meal Date</span>
                <p className="text-gray-900 font-semibold mt-0.5">{tomorrowDateFormatted}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Dining Slot</span>
                <p className="text-gray-900 font-semibold mt-0.5">{menuData.food.mealType || "All Day"}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Menu Status</span>
                <p className="text-emerald-700 font-medium mt-0.5 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Kitchen Confirmed</span>
                </p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Feedback Window</span>
                <p className="text-gray-600 mt-0.5">Rating opens upon meal service tomorrow</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link href="/student/dashboard">
                <Button variant="outline" size="sm">
                  &larr; Back to Dashboard
                </Button>
              </Link>
              <Link href="/student/poll">
                <Button variant="ghost" size="sm">
                  View Poll Archive &rarr;
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
