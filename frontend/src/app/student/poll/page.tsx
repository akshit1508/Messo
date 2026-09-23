"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { studentApi } from "@/lib/student";
import { formatErrorMessage } from "@/lib/error";
import { PollResponse, PollOptionDto } from "@/types/student";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function TomorrowPollPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poll, setPoll] = useState<PollResponse | null>(null);

  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const fetchPoll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentApi.getActivePoll();
      setPoll(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load active mess poll"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId) {
      setVoteError("Please choose one of the available options before submitting.");
      return;
    }

    setSubmitting(true);
    setVoteError(null);
    setVoteSuccess(null);

    try {
      const response = await studentApi.vote({ optionId: selectedOptionId });
      setVoteSuccess(response.message || "Your vote has been counted!");
      // Refresh poll state immediately from backend
      const updatedPoll = await studentApi.getActivePoll();
      setPoll(updatedPoll);
    } catch (err) {
      setVoteError(formatErrorMessage(err, "Failed to record vote. You may have already cast your ballot."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" text="Loading active mess poll..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchPoll} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Tomorrow's Menu Poll"
        description="Vote on food options proposed by the mess committee for tomorrow's dining schedule."
      />

      {voteSuccess && (
        <Alert
          variant="success"
          title="Vote Recorded"
          onClose={() => setVoteSuccess(null)}
        >
          {voteSuccess}
        </Alert>
      )}

      {voteError && (
        <Alert
          variant="danger"
          title="Vote Failed"
          onClose={() => setVoteError(null)}
        >
          {voteError}
        </Alert>
      )}

      {!poll?.active || !poll.options || poll.options.length === 0 ? (
        <EmptyState
          title="No Active Poll Right Now"
          description="The mess management has not published an active menu poll for tomorrow yet. Please check back later!"
          actionText="Back to Dashboard"
          onAction={() => {}}
        />
      ) : (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Target Meal Date
                </p>
                <CardTitle className="text-xl font-bold text-gray-900 mt-1">
                  {poll.pollDate ? new Date(poll.pollDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }) : "Tomorrow's Meal"}
                </CardTitle>
              </div>
              <Badge variant={poll.alreadyVoted ? "success" : "default"}>
                {poll.alreadyVoted ? "Already Voted" : "Active Poll"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {poll.alreadyVoted ? (
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
                    Your vote has been successfully cast
                  </h4>
                  <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                    Thank you for participating! Results will be tallied and finalized by the mess administration before tomorrow morning.
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
              <form onSubmit={handleVote} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                    Select your preferred food item:
                  </label>

                  <div className="space-y-3">
                    {poll.options.map((option: PollOptionDto) => {
                      const isSelected = selectedOptionId === option.id;
                      return (
                        <label
                          key={option.id}
                          className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-600"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="pollOption"
                            value={option.id}
                            checked={isSelected}
                            onChange={() => setSelectedOptionId(option.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="ml-3.5 text-base font-medium text-gray-900">
                            {option.foodName}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <Link href="/student/dashboard">
                    <Button variant="ghost" type="button" disabled={submitting}>
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={submitting || !selectedOptionId}
                  >
                    {submitting ? "Casting vote..." : "Submit Vote"}
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
