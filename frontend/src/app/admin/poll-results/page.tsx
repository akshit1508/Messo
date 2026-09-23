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

  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getActivePollResults();
      setPollResults(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load active poll results"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handlePublish = async () => {
    if (!pollResults?.pollId) return;

    if (pollResults.totalVotes === 0) {
      setPublishError("Cannot publish menu: This poll has zero student votes. A winner cannot be determined.");
      return;
    }

    setPublishing(true);
    setPublishSuccess(null);
    setPublishError(null);

    try {
      const response = await adminApi.publishActivePoll();
      setPublishSuccess(
        response.message || "Tomorrow's menu has been successfully published based on student vote results!"
      );
      // Refresh results to reflect updated state
      const updated = await adminApi.getActivePollResults();
      setPollResults(updated);
    } catch (err) {
      setPublishError(formatErrorMessage(err, "Failed to publish poll results to tomorrow's menu"));
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
    return <ErrorState message={error} onRetry={fetchResults} />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Live Poll Results"
        description="Inspect real-time student voting counts, percentages, and finalize tomorrow's dining menu."
        action={
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={fetchResults}>
              Refresh Votes
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

      {!pollResults?.pollId || !pollResults.results || pollResults.results.length === 0 ? (
        <EmptyState
          title="No Active Poll Found"
          description="There is currently no active menu poll open for voting. Create a new poll to let students vote on tomorrow's meal."
          actionText="Create New Poll"
          onAction={() => {
            window.location.href = "/admin/create-poll";
          }}
        />
      ) : (
        <div className="space-y-6">
          <Card className="border border-gray-200 shadow-xs">
            <CardHeader className="pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Poll #{pollResults.pollId} Overview
                </p>
                <CardTitle className="text-lg font-bold text-gray-900 mt-1">
                  Vote Distribution
                </CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={pollResults.active ? "success" : "neutral"}>
                  {pollResults.active ? "Voting Active" : "Poll Closed"}
                </Badge>
                <Badge variant="default">
                  {pollResults.totalVotes} Total Vote{pollResults.totalVotes !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Option Vote Bars */}
              <div className="space-y-3">
                {pollResults.results.map((opt) => (
                  <VoteBar
                    key={opt.foodName}
                    foodName={opt.foodName}
                    votes={opt.votes}
                    percentage={opt.percentage}
                    isWinner={
                      pollResults.totalVotes > 0 &&
                      pollResults.winningFood === opt.foodName
                    }
                  />
                ))}
              </div>

              {/* Winner Banner or Zero-Vote State */}
              {pollResults.totalVotes > 0 && pollResults.winningFood ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                      Current Leading Food Item
                    </p>
                    <p className="text-lg font-bold text-emerald-950 mt-0.5">
                      {pollResults.winningFood}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={publishing || !pollResults.active}
                    onClick={handlePublish}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {publishing
                      ? "Publishing..."
                      : !pollResults.active
                      ? "Already Finalized"
                      : "Publish to Tomorrow's Menu"}
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                  <p className="font-semibold">No votes cast yet</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Waiting for student participation. A winner cannot be finalized or published until at least one vote has been cast.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
