"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { studentApi } from "@/lib/student";
import { formatErrorMessage } from "@/lib/error";
import { AnnouncementDto } from "@/types/student";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function AnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [dismissingId, setDismissingId] = useState<number | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [dismissError, setDismissError] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentApi.getAllAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Announcements couldn't be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleDismiss = async (id: number) => {
    if (dismissingId !== null) return;
    setDismissingId(id);
    setDismissError(null);

    try {
      await studentApi.dismissAnnouncement(id);
      // Remove from visible student feed upon successful backend dismissal
      setDismissedIds((prev) => new Set(prev).add(id));
    } catch (err) {
      setDismissError(formatErrorMessage(err, "Failed to dismiss announcement. Please try again."));
    } finally {
      setDismissingId(null);
    }
  };

  const activeAnnouncements = useMemo(() => {
    return announcements.filter((a) => !dismissedIds.has(a.id));
  }, [announcements, dismissedIds]);

  if (loading) {
    return (
      <div className="min-h-[55vh] flex items-center justify-center">
        <Loading size="lg" text="Loading announcements..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchAnnouncements} />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Announcements"
        description="Important updates and notices from the mess administration."
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

      {/* Dismiss Error Alert */}
      {dismissError && (
        <Alert
          variant="danger"
          title="Action Failed"
          onClose={() => setDismissError(null)}
        >
          {dismissError}
        </Alert>
      )}

      {/* Announcements Feed or Empty State */}
      {activeAnnouncements.length === 0 ? (
        <EmptyState
          title="No announcements"
          description="You're all caught up. New updates will appear here."
          actionText="Return to Dashboard"
          onAction={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/student/dashboard";
            }
          }}
          className="border-slate-200"
        />
      ) : (
        <div className="space-y-4">
          {activeAnnouncements.map((announcement) => {
            const isDismissing = dismissingId === announcement.id;
            let formattedDate = "";
            try {
              formattedDate = new Date(announcement.createdAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });
            } catch {
              formattedDate = announcement.createdAt;
            }

            return (
              <Card
                key={announcement.id}
                className="border-slate-200/90 hover:border-slate-300 transition-colors shadow-xs"
              >
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" aria-hidden="true" />
                      <CardTitle className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight break-words">
                        {announcement.title}
                      </CardTitle>
                    </div>
                    {formattedDate && (
                      <p className="text-xs text-slate-500 pl-4.5 font-medium">
                        {formattedDate}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isDismissing}
                      onClick={() => handleDismiss(announcement.id)}
                      className="text-xs text-slate-600 hover:text-slate-900"
                      aria-label={`Dismiss announcement: ${announcement.title}`}
                    >
                      {isDismissing ? "Dismissing..." : "Dismiss"}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words pl-0.5">
                    {announcement.message}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
