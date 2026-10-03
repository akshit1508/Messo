"use client";

import React, { useState } from "react";
import { ActionBriefData } from "@/types/agent";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface ActionBriefCardProps {
  brief: ActionBriefData;
  status: string;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onExecute: () => Promise<void>;
  isActionLoading: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export function ActionBriefCard({
  brief,
  status,
  onApprove,
  onReject,
  onExecute,
  isActionLoading,
  approvedBy,
  approvedAt,
}: ActionBriefCardProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmExecuteMode, setConfirmExecuteMode] = useState(false);

  const isApproved = status === "APPROVED";
  const isWaitingApproval = status === "WAITING_FOR_APPROVAL";
  const isCompleted = status === "COMPLETED";

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return;
    await onReject(rejectReason.trim());
    setRejectMode(false);
  };

  const handleConfirmExecute = async () => {
    setConfirmExecuteMode(false);
    await onExecute();
  };

  return (
    <Card className="border border-slate-200/90 shadow-2xs">
      {/* 1. Header Banner & State Notification */}
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
        {/* Subtle Review Required Alert Banner */}
        {isWaitingApproval && (
          <div className="mb-3 p-2.5 bg-amber-50/80 border border-amber-200/70 rounded-lg text-xs text-amber-900 flex items-center justify-between">
            <div>
              <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-800 mr-2 block sm:inline">
                Review Required
              </span>
              <span>
                Your review and decision are required before any operational action can proceed.
              </span>
            </div>
            <span className="shrink-0 ml-2 px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">
              PENDING DECISION
            </span>
          </div>
        )}

        {/* Approved State Banner */}
        {isApproved && (
          <div className="mb-3 p-2.5 bg-sky-50/80 border border-sky-200/80 rounded-lg text-xs text-sky-950">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-sky-900">
                Action Approved
              </span>
              <span className="text-[11px] text-sky-700">
                Approved by <strong>{approvedBy || "Admin"}</strong>
                {approvedAt && ` on ${new Date(approvedAt).toLocaleString()}`}
              </span>
            </div>
            <p className="text-[11px] text-sky-800 mt-1">
              Approval has authorized this action. The action has not yet executed. Confirm execution below.
            </p>
          </div>
        )}

        {/* Completed State Summary Banner */}
        {isCompleted && (
          <div className="mb-3 p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center justify-between">
            <div>
              <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-900 mr-2">
                Action Executed
              </span>
              <span>An operational recommendation record was created for review.</span>
            </div>
            <Badge variant="neutral" size="sm">
              COMPLETED
            </Badge>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                Action Proposal
              </span>
              <CardTitle className="text-base text-slate-900 font-bold">
                {brief.title}
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 mt-1">{brief.summary}</p>
          </div>
          <Badge
            variant={
              isCompleted
                ? "neutral"
                : isApproved
                ? "info"
                : isWaitingApproval
                ? "warning"
                : "neutral"
            }
          >
            {status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 text-xs text-slate-700">
        {/* 2. What Stood Out (Observations) */}
        {brief.observations?.length > 0 && (
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              What Stood Out
            </h4>
            <ul className="space-y-1 pl-4 list-disc marker:text-slate-400 text-slate-600 leading-relaxed text-xs">
              {brief.observations.map((obs, idx) => (
                <li key={idx}>{obs}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. Evidence */}
        {brief.evidence?.length > 0 && (
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              Evidence
            </h4>
            <div className="space-y-1.5">
              {brief.evidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-50 border border-slate-200/70 rounded text-slate-700 font-mono text-[11px]"
                >
                  {ev}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Possible Contributing Factors (Strict Epistemic Humility) */}
        {brief.possibleFactors?.length > 0 && (
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              Possible Contributing Factors
            </h4>
            <ul className="space-y-1 pl-4 list-disc marker:text-amber-500 text-slate-600 leading-relaxed text-xs">
              {brief.possibleFactors.map((factor, idx) => (
                <li key={idx}>{factor}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 5. Analysis Results */}
        {brief.modelOutputs?.length > 0 && (
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              Analysis Results
            </h4>
            <ul className="space-y-1 pl-4 list-disc marker:text-slate-400 text-slate-600 leading-relaxed text-xs">
              {brief.modelOutputs.map((out, idx) => (
                <li key={idx}>{out}</li>
              ))}
            </ul>

            {brief.sourceSteps?.length > 0 && (
              <details className="mt-2 pt-1.5 border-t border-slate-100 group">
                <summary className="cursor-pointer text-[10px] uppercase tracking-wider font-semibold text-slate-400 hover:text-slate-600 select-none flex items-center justify-between">
                  <span>Technical Details</span>
                  <span className="text-[9px] group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-1.5 p-2 bg-slate-50 rounded text-[11px] text-slate-600 space-y-1 border border-slate-200/60">
                  <div>
                    <span className="font-medium text-slate-700">Source Step Orders:</span>{" "}
                    {brief.sourceSteps.map((s) => `Step #${s}`).join(", ")}
                  </div>
                  {brief.generatedAt && (
                    <div>
                      <span className="font-medium text-slate-700">Generated At:</span>{" "}
                      {new Date(brief.generatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        )}

        {/* 6. Proposed Action Box (High visual salience) */}
        {brief.proposedAction && (
          <div className="p-3.5 bg-slate-900 text-white rounded-lg space-y-2 border border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[11px] text-slate-300 uppercase tracking-wider">
                Proposed Action
              </span>
              {brief.proposedAction.suggestedTarget && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                  Target: {brief.proposedAction.suggestedTarget}
                </span>
              )}
            </div>

            <div className="text-sm font-semibold text-white">
              {brief.proposedAction.type?.replace(/_/g, " ")}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {brief.proposedAction.description}
            </p>

            {brief.rationale && (
              <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                Rationale: {brief.rationale}
              </p>
            )}

            <div className="text-[10px] text-slate-400 pt-0.5 flex items-center justify-between">
              <span>Proposal only · No operational changes applied yet</span>
            </div>
          </div>
        )}

        {/* 7. Assumptions & Limitations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] text-slate-500">
          {brief.assumptions?.length > 0 && (
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200/70">
              <span className="font-semibold text-slate-700 block mb-1">
                Assumptions:
              </span>
              <ul className="list-disc pl-3.5 space-y-0.5">
                {brief.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {brief.limitations?.length > 0 && (
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200/70">
              <span className="font-semibold text-slate-700 block mb-1">
                Limitations:
              </span>
              <ul className="list-disc pl-3.5 space-y-0.5">
                {brief.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 8. Human Review Controls (Approve / Reject / Execute) */}
        <div className="pt-3 border-t border-slate-100">
          {/* Waiting for approval controls */}
          {isWaitingApproval && !rejectMode && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Review findings and choose an action:
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectMode(true)}
                  disabled={isActionLoading}
                >
                  Reject Proposal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onApprove}
                  isLoading={isActionLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium"
                >
                  Approve Proposal
                </Button>
              </div>
            </div>
          )}

          {/* Rejection input dialog */}
          {isWaitingApproval && rejectMode && (
            <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-700">
                Specify reason for rejecting proposal:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Schedule already altered, data unrepresentative..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleConfirmReject}
                  isLoading={isActionLoading}
                  disabled={!rejectReason.trim()}
                >
                  Confirm Reject
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRejectMode(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Approved state: Execution confirmation & Consequential action */}
          {isApproved && (
            <div>
              {!confirmExecuteMode ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500">
                    Ready to record administrative recommendation:
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setConfirmExecuteMode(true)}
                    disabled={isActionLoading}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-xs"
                  >
                    Execute Approved Action
                  </Button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded text-xs space-y-2">
                  <div className="font-semibold text-emerald-950">
                    Confirm Action Execution
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Executing will create an administrative recommendation record for target &ldquo;
                    {brief.proposedAction?.suggestedTarget || "General"}&rdquo; with status PENDING_REVIEW.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmExecuteMode(false)}
                      disabled={isActionLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleConfirmExecute}
                      isLoading={isActionLoading}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
                    >
                      Confirm & Execute
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
