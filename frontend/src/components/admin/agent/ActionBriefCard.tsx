"use client";

import React, { useState } from "react";
import { ActionBriefData } from "@/types/agent";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  humanizeStatus,
  humanizeActionType,
  humanizeTarget,
  humanizeInvestigationTitle,
  humanizeInvestigationSummary,
  humanizeContributingFactor,
  humanizeEvidence,
  humanizeObservation,
} from "@/lib/agentDisplay";

interface ActionBriefCardProps {
  brief: ActionBriefData;
  status: string;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onExecute: () => Promise<void>;
  isActionLoading: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  recommendationId?: number | null;
  failureCode?: string | null;
  failureReason?: string | null;
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
  recommendationId,
  failureCode,
  failureReason,
}: ActionBriefCardProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmExecuteMode, setConfirmExecuteMode] = useState(false);

  const isApproved = status === "APPROVED";
  const isWaitingApproval = status === "WAITING_FOR_APPROVAL";
  const isCompleted = status === "COMPLETED";
  const isFailed = status === "FAILED";

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return;
    await onReject(rejectReason.trim());
    setRejectMode(false);
  };

  const handleConfirmExecute = async () => {
    setConfirmExecuteMode(false);
    await onExecute();
  };

  const displayTitle = humanizeInvestigationTitle(
    brief.title,
    brief.proposedAction?.suggestedTarget
  );
  const displaySummary = humanizeInvestigationSummary(brief.summary);

  const recommendationHeading =
    brief.title && !brief.title.startsWith("Action Brief:")
      ? brief.title
      : brief.title?.startsWith("Action Brief: ")
      ? humanizeInvestigationTitle(brief.title, brief.proposedAction?.suggestedTarget)
      : humanizeActionType(brief.proposedAction?.type);

  return (
    <Card className="border border-slate-200/90 shadow-2xs">
      {/* 1. Header Banner & State Notification */}
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
        {/* Subtle Review Required Alert Banner */}
        {isWaitingApproval && (
          <div className="mb-3 p-2.5 bg-amber-50/80 border border-amber-200/70 rounded-lg text-xs text-amber-900 flex items-center justify-between">
            <div>
              <span className="font-semibold text-xs text-amber-800 mr-2 block sm:inline">
                Review required
              </span>
              <span>
                Your review and decision are required before any operational action can proceed.
              </span>
            </div>
            <span className="shrink-0 ml-2 px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200">
              Awaiting your review
            </span>
          </div>
        )}

        {/* Approved State Banner */}
        {(isApproved || isCompleted) && (
          <div className="mb-3 p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-lg text-xs text-emerald-950 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-bold text-xs text-emerald-900">
                RECOMMENDATION APPROVED
              </span>
              <span className="text-[11px] text-emerald-700">
                Approved by <strong>{approvedBy || "Admin"}</strong>
                {approvedAt && ` on ${new Date(approvedAt).toLocaleString()}`}
              </span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              This recommendation has been approved and is ready for implementation by the mess administration team.
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px] text-emerald-700 border-t border-emerald-200/60">
              <span>
                Status: <strong className="font-semibold text-emerald-900">Ready for implementation</strong>
              </span>
              <span className="italic text-emerald-600">No direct menu modifications were applied</span>
            </div>
          </div>
        )}

        {/* Failed State Banner */}
        {isFailed && (
          <div className="mb-3 p-3 bg-rose-50/90 border border-rose-300 rounded-lg text-xs text-rose-950 space-y-1.5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                ACTION COULD NOT COMPLETE
              </span>
              {failureCode && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-rose-100 text-rose-800 border border-rose-300">
                  {failureCode}
                </span>
              )}
            </div>
            <p className="text-xs text-rose-800 leading-relaxed font-medium">
              {failureReason || "The operations backend aborted execution to safeguard operational data."}
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px] text-rose-700 border-t border-rose-200/60">
              <span>Status: <strong className="font-semibold text-rose-900">Execution Aborted</strong></span>
              <span className="italic text-rose-600">No operational menu mutations were applied</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Recommendation
              </span>
              <CardTitle className="text-base text-slate-900 font-bold">
                {displayTitle}
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 mt-1">{displaySummary}</p>
          </div>
          <Badge
            variant={
              isApproved || isCompleted
                ? "success"
                : isFailed
                ? "danger"
                : isWaitingApproval
                ? "warning"
                : "neutral"
            }
          >
            {isApproved || isCompleted
              ? "Ready for implementation"
              : isFailed
              ? "Could not complete"
              : "Awaiting your review"}
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
                <li key={idx}>{humanizeObservation(obs)}</li>
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
                  className="p-2 bg-slate-50 border border-slate-200/70 rounded text-slate-700 text-[11px]"
                >
                  {humanizeEvidence(ev)}
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
                <li key={idx}>{humanizeContributingFactor(factor)}</li>
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

            {(brief.sourceSteps?.length > 0 || recommendationId != null || brief.generatedAt) && (
              <details className="mt-2 pt-1.5 border-t border-slate-100 group">
                <summary className="cursor-pointer text-[10px] uppercase tracking-wider font-semibold text-slate-400 hover:text-slate-600 select-none flex items-center justify-between">
                  <span>Technical Details</span>
                  <span className="text-[9px] group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-1.5 p-2 bg-slate-50 rounded text-[11px] text-slate-600 space-y-1 border border-slate-200/60">
                  {recommendationId != null && (
                    <div>
                      <span className="font-medium text-slate-700">Recommendation ID:</span>{" "}
                      #{recommendationId}
                    </div>
                  )}
                  {brief.sourceSteps?.length > 0 && (
                    <div>
                      <span className="font-medium text-slate-700">Source Step Orders:</span>{" "}
                      {brief.sourceSteps.map((s) => `Step #${s}`).join(", ")}
                    </div>
                  )}
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

        {/* 6. Primary Recommendation Section (Strongest Visual Hierarchy) */}
        {brief.proposedAction && (
          <div className="p-4 sm:p-5 bg-emerald-50/40 border-2 border-emerald-700/30 rounded-lg space-y-3.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-[10px] tracking-wide px-2.5 py-0.5 rounded bg-emerald-800 text-white uppercase">
                {isApproved || isCompleted ? "RECOMMENDATION APPROVED" : "RECOMMENDATION"}
              </span>
              {brief.proposedAction.suggestedTarget && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-white text-slate-700 border border-emerald-200">
                  For: {humanizeTarget(brief.proposedAction.suggestedTarget)}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {recommendationHeading}
              </h3>
              <p className="text-xs sm:text-sm text-slate-800 mt-1 leading-relaxed bg-white p-3 rounded border border-emerald-200/70">
                {brief.proposedAction.description}
              </p>
            </div>

            {brief.rationale && (
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                  WHY THIS WAS PROPOSED
                </span>
                <p className="text-xs text-slate-600 italic">
                  {brief.rationale}
                </p>
              </div>
            )}

            {/* Assumptions & Limitations inside Recommendation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] text-slate-600">
              {brief.assumptions?.length > 0 && (
                <div className="p-2.5 bg-white rounded border border-emerald-200/60">
                  <span className="font-semibold text-slate-800 block mb-1">
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
                <div className="p-2.5 bg-white rounded border border-emerald-200/60">
                  <span className="font-semibold text-slate-800 block mb-1">
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

            {/* Status & Approval Metadata */}
            <div className="pt-2.5 border-t border-emerald-200/60 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
                  <Badge
                    variant={isApproved || isCompleted ? "success" : isFailed ? "danger" : isWaitingApproval ? "warning" : "neutral"}
                    size="sm"
                  >
                    {isApproved || isCompleted ? "READY FOR IMPLEMENTATION" : isFailed ? "COULD NOT COMPLETE" : "AWAITING REVIEW"}
                  </Badge>
                </div>
                <span className="italic text-[11px] text-emerald-700">No direct menu modifications were applied</span>
              </div>

              <div className="text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-100">
                <span>Prepared by <strong>MESO AI Operations Agent</strong></span>
                {approvedBy && (
                  <span>
                    Approved by <strong>{approvedBy}</strong>
                    {approvedAt && ` on ${new Date(approvedAt).toLocaleDateString()}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 7. What Happens Next (After Approval) */}
        {(isApproved || isCompleted) && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
              WHAT HAPPENS NEXT?
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-600 leading-relaxed">
              <li>An Implementation Task is created from this approved recommendation.</li>
              <li>The mess administration team reviews the implementation task.</li>
              <li>The team applies any changes through normal mess operational workflows.</li>
              <li>The team marks the implementation task as completed.</li>
            </ol>
          </div>
        )}

        {/* 8. Human Review Controls (Approve / Reject) */}
        {isWaitingApproval && (
          <div className="pt-3 border-t border-slate-100">
            {!rejectMode ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Review findings and decide on this recommendation:
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
                    className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium"
                  >
                    Approve Recommendation
                  </Button>
                </div>
              </div>
            ) : (
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
          </div>
        )}

        {/* 9. Retry Controls for Failed Runs */}
        {isFailed && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              The operational conflict prevented applying this change. You can retry execution:
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={onExecute}
              isLoading={isActionLoading}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium"
            >
              Retry Action Execution
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
