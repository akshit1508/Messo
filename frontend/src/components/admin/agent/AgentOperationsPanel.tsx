"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AgentRunResponse,
  AgentStepResponse,
  ActionBriefData,
  AgentRecommendationResponse,
  AgentImplementationTaskResponse,
} from "@/types/agent";
import {
  getAgentRuns,
  getAgentRun,
  getAgentRunSteps,
  createAgentRun,
  startAgentInvestigation,
  approveAgentRun,
  rejectAgentRun,
  executeAgentAction,
  getAgentRunRecommendations,
  getAgentRunTasks,
  startAgentTask,
  completeAgentTask,
  cancelAgentTask,
} from "@/lib/agentApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AgentStartModal } from "./AgentStartModal";
import { AgentTimeline } from "./AgentTimeline";
import { ActionBriefCard } from "./ActionBriefCard";
import { RecommendationResultCard } from "./RecommendationResultCard";
import { ImplementationTaskCard } from "./ImplementationTaskCard";
import { AgentAuditTrail } from "./AgentAuditTrail";

import {
  humanizeStatus,
  humanizeShortTarget,
  humanizeTarget,
} from "@/lib/agentDisplay";

export function getHumanStateLabel(status?: string | null): string {
  return humanizeStatus(status);
}

// Operational Agent Decision Desk main view
export function AgentOperationsPanel() {
  const [runs, setRuns] = useState<AgentRunResponse[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [activeRun, setActiveRun] = useState<AgentRunResponse | null>(null);
  const [steps, setSteps] = useState<AgentStepResponse[]>([]);
  const [recommendations, setRecommendations] = useState<AgentRecommendationResponse[]>([]);
  const [tasks, setTasks] = useState<AgentImplementationTaskResponse[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load all runs on mount
  const loadRuns = useCallback(async () => {
    try {
      const data = await getAgentRuns();
      setRuns(data);
      if (data.length > 0 && selectedRunId === null) {
        setSelectedRunId(data[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load agent runs:", err);
    }
  }, [selectedRunId]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  // Load selected run details, steps, recommendations, and tasks
  const loadRunDetails = useCallback(async (runId: number) => {
    try {
      const [runData, stepsData, recsData, tasksData] = await Promise.all([
        getAgentRun(runId),
        getAgentRunSteps(runId),
        getAgentRunRecommendations(runId),
        getAgentRunTasks(runId).catch(() => []),
      ]);
      setActiveRun(runData);
      setSteps(stepsData);
      setRecommendations(recsData);
      setTasks(tasksData);
    } catch (err: any) {
      console.error(`Failed to load details for run ${runId}:`, err);
    }
  }, []);

  useEffect(() => {
    if (selectedRunId !== null) {
      loadRunDetails(selectedRunId);
    }
  }, [selectedRunId, loadRunDetails]);

  // Polling only while RUNNING
  useEffect(() => {
    if (activeRun && activeRun.status === "RUNNING") {
      pollingRef.current = setInterval(() => {
        loadRunDetails(activeRun.id);
      }, 2500);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [activeRun, loadRunDetails]);

  // Start new investigation
  const handleStartInvestigation = async ({
    goalType,
    goalTarget,
    goalDescription,
  }: {
    goalType: any;
    goalTarget: string;
    goalDescription: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const created = await createAgentRun({
        goalType,
        goalTarget,
        goalDescription,
      });

      setSelectedRunId(created.id);
      setActiveRun(created);

      await startAgentInvestigation(created.id);
      await loadRunDetails(created.id);
      await loadRuns();
    } catch (err: any) {
      setError(err?.message || "Failed to start investigation");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Approve Recommendation
  const handleApprove = async () => {
    if (!activeRun) return;
    setIsActionLoading(true);
    setError(null);
    try {
      if (activeRun.status === "WAITING_FOR_APPROVAL") {
        await approveAgentRun(activeRun.id);
      }
      // Record recommendation in backend review mode
      const execResult = await executeAgentAction(activeRun.id);
      if (execResult.executionStatus === "FAILED" || execResult.status === "FAILED") {
        setError(execResult.error || "Action execution could not be completed.");
      }
      await loadRunDetails(activeRun.id);
      await loadRuns();
    } catch (err: any) {
      setError(err?.message || "Approval could not be completed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Reject
  const handleReject = async (reason: string) => {
    if (!activeRun) return;
    setIsActionLoading(true);
    setError(null);
    try {
      const updated = await rejectAgentRun(activeRun.id, reason);
      setActiveRun(updated);
      await loadRuns();
    } catch (err: any) {
      setError(err?.message || "Rejection could not be completed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Execute (fallback to handleApprove)
  const handleExecute = async () => {
    await handleApprove();
  };

  // Handle Implementation Task actions
  const handleStartTask = async (taskId: number) => {
    setIsActionLoading(true);
    setError(null);
    try {
      await startAgentTask(taskId);
      if (selectedRunId) {
        await loadRunDetails(selectedRunId);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to start task.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    setIsActionLoading(true);
    setError(null);
    try {
      await completeAgentTask(taskId);
      if (selectedRunId) {
        await loadRunDetails(selectedRunId);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to complete task.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelTask = async (taskId: number, reason?: string) => {
    setIsActionLoading(true);
    setError(null);
    try {
      await cancelAgentTask(taskId, reason);
      if (selectedRunId) {
        await loadRunDetails(selectedRunId);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to cancel task.");
    } finally {
      setIsActionLoading(false);
    }
  };

  let parsedBrief: ActionBriefData | null = null;
  if (activeRun?.actionBrief) {
    try {
      parsedBrief = JSON.parse(activeRun.actionBrief);
    } catch {
      parsedBrief = null;
    }
  }

  const isRunning = activeRun?.status === "RUNNING";

  return (
    <div className="space-y-5">
      {/* 1. Decision Desk Header */}
      <div className="bg-white border border-slate-200/90 rounded-lg p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-emerald-800">
              Decision Desk
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              AI Operations Agent
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Investigate an operational issue, connect the relevant evidence, and prepare a recommendation for review.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeRun && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                <span className="text-slate-400">Investigation #{activeRun.id}:</span>
                <span className="font-semibold text-slate-800">{getHumanStateLabel(activeRun.status)}</span>
              </div>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium shadow-xs text-xs sm:text-sm px-4 py-2"
            >
              Start an Investigation
            </Button>
          </div>
        </div>
      </div>

      {/* Operational Workflow Progression Strip */}
      {activeRun && (
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px]">
            <span className={activeRun.status === "RUNNING" && steps.length < 2 ? "font-bold text-emerald-900" : "text-slate-700"}>
              Investigation
            </span>
            <span className="text-slate-300 select-none">→</span>
            <span className={activeRun.status === "RUNNING" && steps.length >= 2 ? "font-bold text-emerald-900" : steps.length > 0 ? "text-slate-700" : "text-slate-400"}>
              Analysis
            </span>
            <span className="text-slate-300 select-none">→</span>
            <span className={parsedBrief ? "text-slate-700" : "text-slate-400"}>
              Recommendation
            </span>
            <span className="text-slate-300 select-none">→</span>
            <span className={activeRun.status === "WAITING_FOR_APPROVAL" ? "font-bold text-amber-900" : activeRun.status === "APPROVED" || activeRun.status === "COMPLETED" ? "text-slate-700" : "text-slate-400"}>
              Review
            </span>
            <span className="text-slate-300 select-none">→</span>
            <span className={activeRun.status === "APPROVED" && tasks.length === 0 ? "font-bold text-emerald-900" : activeRun.status === "APPROVED" || activeRun.status === "COMPLETED" ? "text-slate-700" : "text-slate-400"}>
              Approved
            </span>
            <span className="text-slate-300 select-none">→</span>
            <span className={tasks.length > 0 && tasks[0].status === "READY_FOR_VERIFICATION" ? "font-bold text-amber-900" : tasks.length > 0 && tasks[0].status !== "COMPLETED" ? "font-bold text-sky-900" : tasks.length > 0 ? "text-slate-700" : "text-slate-400"}>
              {tasks[0]?.status === "READY_FOR_VERIFICATION" ? "Ready for Verification" : "Implementation Task"}
            </span>
            <span className="text-slate-300 select-none">→</span>
            <span className={tasks[0]?.status === "COMPLETED" ? "font-bold text-emerald-900" : "text-slate-400"}>
              Verified & Completed
            </span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span>Investigation #{activeRun.id}</span>
            <span>·</span>
            <span className="font-semibold text-slate-800">{getHumanStateLabel(activeRun.status)}</span>
          </div>
        </div>
      )}

      {/* Run Failure / Safeguard Halt Alert */}
      {activeRun?.status === "FAILED" && (
        <div className="p-4 bg-rose-50/90 border border-rose-300 text-rose-950 rounded-lg space-y-2 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
              <span className="font-bold text-xs uppercase tracking-wider text-rose-900">
                Action Could Not Be Completed (Safeguard Protected)
              </span>
            </div>
            {activeRun.failureCode && (
              <span className="px-2 py-0.5 font-mono text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300 rounded">
                {activeRun.failureCode}
              </span>
            )}
          </div>
          <div className="bg-white/90 p-3 rounded border border-rose-200 text-rose-900 text-xs leading-relaxed font-medium">
            <span className="font-bold text-rose-950 block mb-1">Reason returned by operations engine:</span>
            {activeRun.failureReason || "An operational validation safeguard prevented modifying data because the current state did not match expected inputs."}
          </div>
          <p className="text-[11px] text-rose-700 italic">
            Safeguard guarantee: No partial or inconsistent changes were made to operational menu records.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center justify-between">
          <div>
            <span className="font-semibold mr-1">Error:</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-2 text-sm"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Investigation Selector Bar */}
      {runs.length > 0 && (
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">
              Investigations:
            </span>
            <div className="flex items-center gap-2">
              {runs.map((r) => {
                const isSelected = selectedRunId === r.id;
                const targetLabel = humanizeTarget(r.goalTarget);
                const dateLabel = r.createdAt
                  ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "";

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRunId(r.id)}
                    className={`px-3 py-1.5 text-xs rounded-lg text-left transition-all border shrink-0 ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <span className="font-semibold block leading-tight">
                      {targetLabel}
                    </span>
                    <span
                      className={`text-[10px] block leading-tight mt-0.5 ${
                        isSelected ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      Investigation {r.id}{dateLabel ? ` · ${dateLabel}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeRun && (
            <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
              <span className="text-[11px] text-slate-500">Status:</span>
              <Badge
                variant={
                  activeRun.status === "COMPLETED"
                    ? "neutral"
                    : activeRun.status === "APPROVED"
                    ? "info"
                    : activeRun.status === "WAITING_FOR_APPROVAL"
                    ? "warning"
                    : activeRun.status === "FAILED" || activeRun.status === "CANCELLED"
                    ? "danger"
                    : "default"
                }
              >
                {getHumanStateLabel(activeRun.status)}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* 3. Main Operational Workspace (Desktop 2-column, Mobile stacked) */}
      {activeRun ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left / Primary Column: Investigation Timeline */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-slate-200/90 shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Investigation timeline
                  </CardTitle>
                  <span className="text-[11px] font-mono text-slate-400">
                    Investigation #{activeRun.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeRun.goalDescription || "Operational investigation sequence"}
                </p>
              </CardHeader>
              <CardContent className="pt-3">
                <AgentTimeline
                  steps={steps}
                  currentStepName={activeRun.currentStepName}
                  isRunning={isRunning}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right / Secondary Column: Current Findings / Action Brief / Recommendation / Audit */}
          <div className="lg:col-span-7 space-y-4">
            {parsedBrief ? (
              <ActionBriefCard
                brief={parsedBrief}
                status={activeRun.status}
                onApprove={handleApprove}
                onReject={handleReject}
                onExecute={handleExecute}
                isActionLoading={isActionLoading}
                approvedBy={activeRun.approvedBy}
                approvedAt={activeRun.approvedAt}
                recommendationId={recommendations[0]?.id}
                failureCode={activeRun.failureCode}
                failureReason={activeRun.failureReason}
              />
            ) : recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <RecommendationResultCard key={rec.id} recommendation={rec} />
                ))}
              </div>
            ) : isRunning ? (
              <Card className="border border-slate-200 text-center p-8">
                <div className="max-w-sm mx-auto space-y-2.5">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mx-auto" />
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Investigation in progress
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The Agent is gathering evidence and evaluating patterns for Investigation #{activeRun.id}.
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="border border-slate-200 text-center p-8 text-xs text-slate-500">
                No recommendation available for this investigation yet.
              </Card>
            )}

            {/* Implementation Tasks (Rendered directly below recommendation / approval card) */}
            {tasks.length > 0 && (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <ImplementationTaskCard
                    key={task.id}
                    task={task}
                    onStart={handleStartTask}
                    onComplete={handleCompleteTask}
                    onCancel={handleCancelTask}
                    isLoading={isActionLoading}
                  />
                ))}
              </div>
            )}

            {/* Audit Trail */}
            <AgentAuditTrail
              run={activeRun}
              steps={steps}
              recommendations={recommendations}
              tasks={tasks}
            />
          </div>
        </div>
      ) : (
        /* Empty landing state when no investigations exist */
        <Card className="border border-slate-200/90 text-center py-12 px-4 bg-white">
          <div className="max-w-md mx-auto space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900">
              No investigation started yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Start with a recent operational issue and let the agent gather the relevant evidence.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-4 py-2"
              >
                Start an Investigation
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Start Modal */}
      <AgentStartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleStartInvestigation}
        isLoading={isLoading}
      />
    </div>
  );
}
