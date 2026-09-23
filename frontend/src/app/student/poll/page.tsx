"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
      setVoteError("Please select one of the food options before casting your vote.");
      return;
    }

    setSubmitting(true);
    setVoteError(null);
    setVoteSuccess(null);

    try {
      const response = await studentApi.vote({ optionId: selectedOptionId });
      setVoteSuccess(response.message || "Your vote has been recorded.");
      // Refresh poll state immediately from backend to get authoritative alreadyVoted status
      const updatedPoll = await studentApi.getActivePoll();
      setPoll(updatedPoll);
    } catch (err) {
      setVoteError(
        formatErrorMessage(
          err,
          "Failed to record vote. You may have already cast your ballot for this poll."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formattedPollDate = useMemo(() => {
    if (!poll?.pollDate) return "Tomorrow's Dining Menu";
    try {
      return new Date(poll.pollDate).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return poll.pollDate;
    }
  }, [poll?.pollDate]);

  if (loading) {
    return (
      <div className="min-h-[55vh] flex items-center justify-center">
        <Loading size="lg" text="Loading active mess poll..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchPoll} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Tomorrow's Food Poll"
        description="Choose the meal you'd like to see on tomorrow's menu."
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

      {/* Success Notification Alert */}
      {voteSuccess && (
        <Alert
          variant="success"
          title="Vote Recorded"
          onClose={() => setVoteSuccess(null)}
        >
          {voteSuccess}
        </Alert>
      )}

      {/* Error Notification Alert */}
      {voteError && (
        <Alert
          variant="danger"
          title="Vote Failed"
          onClose={() => setVoteError(null)}
        >
          {voteError}
        </Alert>
      )}

      {/* Edge Case: No active poll or empty options */}
      {!poll?.active || !poll.options || poll.options.length === 0 ? (
        <EmptyState
          title="No active food poll"
          description="The mess committee has not published an active menu poll for tomorrow yet. Please check back later or view tomorrow's confirmed dining schedule."
          actionText="Return to Dashboard"
          onAction={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/student/dashboard";
            }
          }}
          className="border-slate-200"
        />
      ) : (
        /* Active Poll Card */
        <Card className="border-slate-200/90 shadow-xs">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target Dining Session
                </span>
                <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {formattedPollDate}
                </CardTitle>
                <p className="text-xs text-slate-500">
                  The winning dish will be finalized and prepared by kitchen staff.
                </p>
              </div>

              <div className="shrink-0">
                {poll.alreadyVoted ? (
                  <Badge variant="success" dot={true}>
                    Vote Recorded
                  </Badge>
                ) : (
                  <Badge variant="default" dot={true}>
                    Active Poll
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {poll.alreadyVoted ? (
              /* Already Voted State */
              <div className="text-center py-6 sm:py-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center mx-auto">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-semibold text-slate-900">
                    Your vote has been recorded
                  </h4>
                  <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    Thank you for participating! The mess administration will tally the results and publish the confirmed menu before breakfast tomorrow.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 max-w-md mx-auto text-xs text-slate-600">
                  Each student is allocated one vote per poll cycle to maintain fair selection.
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/student/dashboard" className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      &larr; Return to Dashboard
                    </Button>
                  </Link>
                  <Link href="/student/tomorrow" className="w-full sm:w-auto">
                    <Button variant="ghost" size="sm" className="w-full sm:w-auto text-slate-600">
                      View Tomorrow&apos;s Menu &rarr;
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* Voting Form */
              <form onSubmit={handleVote} className="space-y-6">
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Available Menu Choices ({poll.options.length} options)
                  </legend>

                  <div className="space-y-2.5">
                    {poll.options.map((option: PollOptionDto) => {
                      const isSelected = selectedOptionId === option.id;
                      const inputId = `poll-option-${option.id}`;

                      return (
                        <label
                          key={option.id}
                          htmlFor={inputId}
                          className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 shadow-xs"
                              : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 pr-2">
                            <input
                              type="radio"
                              id={inputId}
                              name="pollOption"
                              value={option.id}
                              checked={isSelected}
                              onChange={() => setSelectedOptionId(option.id)}
                              className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 focus:ring-offset-0 focus:outline-none"
                            />
                            <span
                              className={`text-base tracking-tight truncate ${
                                isSelected
                                  ? "font-semibold text-slate-900"
                                  : "font-medium text-slate-800"
                              }`}
                            >
                              {option.foodName}
                            </span>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <span className="inline-flex items-center text-xs font-medium text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                                Selected
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-mono">
                                Choice #{option.id}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Helpful Voting Context Note */}
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
                    Voting Policy: Each resident is allotted one ballot per poll cycle. Votes are recorded anonymously and cannot be altered once submitted.
                  </p>
                </div>

                {/* Form Action Controls */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <Link href="/student/dashboard" className="w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      type="button"
                      disabled={submitting}
                      className="w-full sm:w-auto text-slate-600"
                    >
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={submitting || !selectedOptionId}
                    className="w-full sm:w-auto"
                  >
                    {submitting ? "Casting vote..." : "Cast Vote"}
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
