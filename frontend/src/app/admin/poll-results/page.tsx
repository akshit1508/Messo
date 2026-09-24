"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin";
import { formatErrorMessage } from "@/lib/error";
import { PollResultResponse } from "@/types/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { VoteBar } from "@/components/admin/VoteBar";

export default function PollResultsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollResults, setPollResults] = useState<PollResultResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const fetchResults = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await adminApi.getActivePollResults();
      setPollResults(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load active poll results"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handlePublish = async () => {
    if (!pollResults?.pollId) return;

    if (pollResults.totalVotes === 0) {
      setPublishError(
        "Cannot publish menu: This poll has zero student votes. A winner cannot be determined."
      );
      return;
    }

    setPublishing(true);
    setPublishSuccess(null);
    setPublishError(null);

    try {
      const response = await adminApi.publishActivePoll();
      setPublishSuccess(
        response.message ||
          "Tomorrow's menu has been successfully published based on student vote results!"
      );
      const updated = await adminApi.getActivePollResults();
      setPollResults(updated);
    } catch (err) {
      setPublishError(
        formatErrorMessage(err, "Failed to publish poll results to tomorrow's menu")
      );
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" text="Loading active poll results..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => fetchResults()} />;
  }

  const hasResults =
    pollResults?.pollId != null &&
    pollResults.results &&
    pollResults.results.length > 0;

  // Sort results: winner first, then by votes descending
  const sortedResults = hasResults
    ? [...pollResults!.results].sort((a, b) => b.votes - a.votes)
    : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Live Poll Results"
        description="Inspect real-time student voting counts, percentages, and finalize tomorrow's dining menu."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchResults(true)}
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
                "Refresh Votes"
              )}
            </Button>
            <Link href="/admin/create-poll">
              <Button variant="primary" size="sm">
                + New Poll
              </Button>
            </Link>
          </div>
        }
      />

      {publishSuccess && (
        <Alert
          variant="success"
          title="Menu Finalized & Published"
          onClose={() => setPublishSuccess(null)}
        >
          {publishSuccess}
        </Alert>
      )}

      {publishError && (
        <Alert
          variant="danger"
          title="Publication Warning"
          onClose={() => setPublishError(null)}
        >
          {publishError}
        </Alert>
      )}

      {!hasResults ? (
        <EmptyState
          title="No Active Poll Found"
          description="There is currently no active menu poll open for voting. Create a new poll to let students vote on tomorrow's meal."
          actionText="Create New Poll"
          onAction={() => {
            window.location.href = "/admin/create-poll";
          }}
        />
      ) : (
        <div className="space-y-5">
          {/* Poll overview card */}
          <Card>
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                    Poll #{pollResults!.pollId} Overview
                  </p>
                  <CardTitle className="text-lg font-bold text-slate-900 mt-1">
                    Vote Distribution
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={pollResults!.active ? "success" : "neutral"} dot>
                    {pollResults!.active ? "Voting Active" : "Poll Closed"}
                  </Badge>
                  <Badge variant="default">
                    {pollResults!.totalVotes} Total Vote
                    {pollResults!.totalVotes !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Vote bars */}
              <div className="space-y-2.5">
                {sortedResults.map((opt, idx) => (
                  <VoteBar
                    key={opt.foodName}
                    foodName={opt.foodName}
                    votes={opt.votes}
                    percentage={opt.percentage}
                    isWinner={
                      pollResults!.totalVotes > 0 &&
                      pollResults!.winningFood === opt.foodName
                    }
                    rank={idx + 1}
                    totalVotes={pollResults!.totalVotes}
                  />
                ))}
              </div>

              {/* Winner / zero-vote section */}
              {pollResults!.totalVotes > 0 && pollResults!.winningFood ? (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      {pollResults!.active ? "Current Leader" : "Winner"}
                    </p>
                    <p className="text-xl font-bold text-emerald-950 mt-1">
                      {pollResults!.winningFood}
                    </p>
                    {pollResults!.active && (
                      <p className="text-xs text-emerald-700 mt-1">
                        Publishing will set this as tomorrow&rsquo;s menu for all students.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={publishing || !pollResults!.active}
                    onClick={handlePublish}
                    className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                  >
                    {publishing ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Publishing…
                      </span>
                    ) : !pollResults!.active ? (
                      "Already Finalized"
                    ) : (
                      "Publish to Tomorrow's Menu"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-sm font-semibold text-amber-900">No votes cast yet</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Waiting for student participation. A winner cannot be finalized or
                    published until at least one vote has been cast.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info note */}
          {!pollResults!.active && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
              <p className="font-semibold text-slate-900 mb-1">Poll is closed</p>
              This poll has been finalized and the menu published. Create a new poll for
              the next day&rsquo;s menu.{" "}
              <Link href="/admin/create-poll" className="text-blue-600 hover:underline font-medium">
                Create new poll →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
