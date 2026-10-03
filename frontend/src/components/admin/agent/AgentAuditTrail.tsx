"use client";

import React, { useState } from "react";
import { AgentRunResponse, AgentStepResponse, AgentRecommendationResponse } from "@/types/agent";

interface AgentAuditTrailProps {
  run: AgentRunResponse;
  steps: AgentStepResponse[];
  recommendations: AgentRecommendationResponse[];
}

export function AgentAuditTrail({
  run,
  steps,
  recommendations,
}: AgentAuditTrailProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const isApproved = run.status === "APPROVED" || run.status === "COMPLETED";
  const isRejected = run.status === "CANCELLED" && !!run.rejectedBy;
  const isExecuted = run.status === "COMPLETED";

  return (
    <div className="border border-slate-200/90 rounded-lg bg-white overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-slate-800 hover:bg-slate-50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-900">
            AUDIT TRAIL & CUSTODY CHAIN
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            ({steps.length} steps · {recommendations.length} recommendations)
          </span>
        </div>
        <span className="text-slate-400 font-mono text-xs">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 pt-0 border-t border-slate-100 space-y-4">
          {/* 1. Human-Readable Lifecycle Flow */}
          <div className="pt-3">
            <h5 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2.5">
              Lifecycle Progression
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
              {/* Step 1: Investigation */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80">
                <span className="block font-semibold text-slate-800">1. Investigation</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">
                  {steps.length} tool steps executed
                </span>
                <span className="text-slate-400 text-[10px] block font-mono mt-1">
                  By {run.initiatedBy}
                </span>
              </div>

              {/* Step 2: Synthesis */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80">
                <span className="block font-semibold text-slate-800">2. Action Brief</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">
                  {run.actionBrief ? "Synthesized for review" : "In preparation"}
                </span>
                <span className="text-slate-400 text-[10px] block font-mono mt-1">
                  {run.goalType}
                </span>
              </div>

              {/* Step 3: Decision */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80">
                <span className="block font-semibold text-slate-800">3. Authorization</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">
                  {isApproved
                    ? `Approved by ${run.approvedBy || "Admin"}`
                    : isRejected
                    ? `Rejected by ${run.rejectedBy}`
                    : "Pending admin review"}
                </span>
                {run.approvedAt && (
                  <span className="text-slate-400 text-[10px] block mt-1">
                    {new Date(run.approvedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Step 4: Execution */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80">
                <span className="block font-semibold text-slate-800">4. Execution</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">
                  {isExecuted
                    ? "Recommendation logged"
                    : isApproved
                    ? "Awaiting execution"
                    : "Pending approval"}
                </span>
                <span className="text-slate-400 text-[10px] block font-mono mt-1">
                  Status: {run.status}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Step Sequence Overview */}
          <div>
            <h5 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
              Executed Steps
            </h5>
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-1.5 px-3">#</th>
                    <th className="py-1.5 px-3">Tool</th>
                    <th className="py-1.5 px-3">Type</th>
                    <th className="py-1.5 px-3">Status</th>
                    <th className="py-1.5 px-3 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {steps.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-3 font-mono text-slate-400">
                        {st.sequenceOrder < 10 ? `0${st.sequenceOrder}` : st.sequenceOrder}
                      </td>
                      <td className="py-1.5 px-3 font-medium text-slate-800">
                        {st.toolName}
                      </td>
                      <td className="py-1.5 px-3 text-slate-500">{st.toolType}</td>
                      <td className="py-1.5 px-3 font-semibold text-slate-700">
                        {st.status}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-slate-500 text-right">
                        {st.durationMs != null ? `${st.durationMs}ms` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Technical Details & Raw Payload Disclosure */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
            >
              <span>{showRawJson ? "Hide" : "Show"} technical details & raw payload</span>
              <span className="text-[10px] font-mono">{showRawJson ? "▲" : "▼"}</span>
            </button>

            {showRawJson && (
              <div className="mt-2 space-y-2">
                <div className="p-2.5 bg-slate-50 rounded text-[11px] text-slate-600 space-y-1 border border-slate-200/80">
                  <div><strong>Run ID:</strong> #{run.id}</div>
                  <div><strong>Initiated By:</strong> {run.initiatedBy}</div>
                  <div><strong>Trigger Type:</strong> {run.triggerType}</div>
                  <div><strong>Created:</strong> {new Date(run.createdAt).toISOString()}</div>
                  {run.completedAt && (
                    <div><strong>Completed:</strong> {new Date(run.completedAt).toISOString()}</div>
                  )}
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded text-[10px] overflow-x-auto font-mono max-h-56">
                  {JSON.stringify(
                    {
                      runId: run.id,
                      status: run.status,
                      goalType: run.goalType,
                      goalTarget: run.goalTarget,
                      approvedBy: run.approvedBy,
                      approvedAt: run.approvedAt,
                      rejectedBy: run.rejectedBy,
                      rejectionReason: run.rejectionReason,
                      actionBrief: run.actionBrief ? JSON.parse(run.actionBrief) : null,
                      recommendations,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
