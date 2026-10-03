"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AgentRunResponse,
  AgentStepResponse,
  ActionBriefData,
  AgentRecommendationResponse,
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
} from "@/lib/agentApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AgentStartModal } from "./AgentStartModal";
import { AgentTimeline } from "./AgentTimeline";
import { ActionBriefCard } from "./ActionBriefCard";
import { RecommendationResultCard } from "./RecommendationResultCard";
import { AgentAuditTrail } from "./AgentAuditTrail";

export function AgentOperationsPanel() {
  const [runs, setRuns] = useState<AgentRunResponse[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [activeRun, setActiveRun] = useState<AgentRunResponse | null>(null);
  const [steps, setSteps] = useState<AgentStepResponse[]>([]);
  const [recommendations, setRecommendations] = useState<AgentRecommendationResponse[]>([]);

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

  // Load selected run details, steps, and recommendations
  const loadRunDetails = useCallback(async (runId: number) => {
    try {
      const [runData, stepsData, recsData] = await Promise.all([
        getAgentRun(runId),
        getAgentRunSteps(runId),
        getAgentRunRecommendations(runId),
      ]);
      setActiveRun(runData);
      setSteps(stepsData);
      setRecommendations(recsData);
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

  // Handle Approve
  const handleApprove = async () => {
    if (!activeRun) return;
    setIsActionLoading(true);
    setError(null);
    try {
      const updated = await approveAgentRun(activeRun.id);
      setActiveRun(updated);
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

  // Handle Execute Action
  const handleExecute = async () => {
    if (!activeRun) return;
    setIsActionLoading(true);
    setError(null);
    try {
      await executeAgentAction(activeRun.id);
      await loadRunDetails(activeRun.id);
      await loadRuns();
    } catch (err: any) {
      setError(err?.message || "Action could not be executed. No operational changes applied.");
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
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
              OPERATIONAL INTELLIGENCE / CONTROL LAYER
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              AI OPERATIONS AGENT
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Investigate operational issues, connect evidence, and prepare controlled actions for review.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeRun && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-slate-400">Run #{activeRun.id}:</span>
                <span className="font-semibold text-white">{activeRun.status}</span>
              </div>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
              className="bg-white hover:bg-slate-100 text-slate-900 font-semibold shadow-xs shrink-0 text-xs"
            >
              + Start Investigation
            </Button>
          </div>
        </div>
      </div>

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

      {/* 2. Run Selector Bar */}
      {runs.length > 0 && (
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Runs:
            </span>
            <div className="flex items-center gap-1.5">
              {runs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRunId(r.id)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    selectedRunId === r.id
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  #{r.id} ({r.goalTarget || "General"})
                </button>
              ))}
            </div>
          </div>

          {activeRun && (
            <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Status:</span>
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
                {activeRun.status}
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
                    INVESTIGATION TIMELINE
                  </CardTitle>
                  <span className="text-[11px] font-mono text-slate-400">
                    Run #{activeRun.id}
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
              />
            ) : isRunning ? (
              <Card className="border border-slate-200 text-center p-8">
                <div className="max-w-sm mx-auto space-y-2.5">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mx-auto" />
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Investigation In Progress
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The Agent is gathering evidence and evaluating statistical models for Run #{activeRun.id}.
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="border border-slate-200 text-center p-8 text-xs text-slate-500">
                No Action Brief available for this run.
              </Card>
            )}

            {/* Recommendations (if action completed) */}
            {recommendations.length > 0 && (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <RecommendationResultCard key={rec.id} recommendation={rec} />
                ))}
              </div>
            )}

            {/* Audit Trail */}
            <AgentAuditTrail
              run={activeRun}
              steps={steps}
              recommendations={recommendations}
            />
          </div>
        </div>
      ) : (
        /* Empty landing state when no runs exist */
        <Card className="border border-slate-200 text-center py-12 px-4">
          <div className="max-w-md mx-auto space-y-2.5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              No Investigations Recorded
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Start an operational investigation to explore drop in dinner satisfaction,
              complaint surges, or menu consistency using registered intelligence engines.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium"
              >
                + Start First Investigation
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
