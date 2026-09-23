"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { studentApi } from "@/lib/student";
import { formatErrorMessage } from "@/lib/error";
import { AnnouncementDto } from "@/types/student";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function AnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [dismissingId, setDismissingId] = useState<number | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentApi.getAllAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load announcements"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleDismiss = async (id: number) => {
    setDismissingId(id);
    try {
      await studentApi.dismissAnnouncement(id);
      // Mark as dismissed without full page reload
      setDismissedIds((prev) => new Set(prev).add(id));
    } catch (err) {
      console.error("Failed to dismiss announcement:", err);
    } finally {
      setDismissingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" text="Loading announcements..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchAnnouncements} />;
  }

  const activeAnnouncements = announcements.filter((a) => !dismissedIds.has(a.id));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Mess Announcements"
        description="Official circulars, timing updates, holiday schedules, and special feasts posted by the mess administration."
        action={
          <Link href="/student/dashboard">
            <Button variant="outline" size="sm">
              &larr; Dashboard
            </Button>
          </Link>
        }
      />

      {activeAnnouncements.length === 0 ? (
        <EmptyState
          title="No Active Announcements"
          description="There are currently no active mess circulars. Any new notices regarding food schedules or maintenance will appear here."
          actionText="Back to Dashboard"
          onAction={() => {
            window.location.href = "/student/dashboard";
          }}
        />
      ) : (
        <div className="space-y-4">
          {activeAnnouncements.map((announcement) => {
            const isDismissing = dismissingId === announcement.id;
            const formattedDate = new Date(announcement.createdAt).toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <Card
                key={announcement.id}
                className="border border-gray-200 hover:border-gray-300 transition-all shadow-xs"
              >
                <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold text-gray-900">
                      {announcement.title}
                    </CardTitle>
                    <p className="text-xs text-gray-500 font-medium">{formattedDate}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDismissing}
                    onClick={() => handleDismiss(announcement.id)}
                    className="text-xs shrink-0"
                  >
                    {isDismissing ? "Dismissing..." : "Dismiss"}
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {announcement.message}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
