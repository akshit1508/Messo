"use client";

import React from "react";
import { AgentStepResponse } from "@/types/agent";

import { humanizeToolName, humanizeStatus } from "@/lib/agentDisplay";

interface AgentTimelineProps {
  steps: AgentStepResponse[];
  currentStepName?: string | null;
  isRunning: boolean;
}

function formatSequence(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

export function AgentTimeline({
  steps,
  currentStepName,
  isRunning,
}: AgentTimelineProps) {
  if (steps.length === 0 && !isRunning) {
    return (
      <div className="py-10 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-slate-200/80">
        No investigation steps recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
        Investigation sequence
      </div>

      <div className="space-y-2">
        {steps.map((step) => {
          const title = humanizeToolName(step.toolName);
          const isCompleted = step.status === "COMPLETED";
          const isFailed = step.status === "FAILED";

          return (
            <div
              key={step.id}
              className="p-3 bg-white rounded-lg border border-slate-200/90 text-xs transition-colors hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-slate-400 font-semibold text-[11px] pt-0.5 select-none">
                    {formatSequence(step.sequenceOrder)}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900 text-xs">
                      {title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>
                        {step.completedAt
                          ? new Date(step.completedAt).toLocaleTimeString()
                          : step.startedAt
                          ? new Date(step.startedAt).toLocaleTimeString()
                          : ""}
                      </span>
                      {step.durationMs != null && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{step.durationMs}ms</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                      isCompleted
                        ? "bg-slate-100 text-slate-700 border border-slate-200"
                        : isFailed
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {humanizeStatus(step.status)}
                  </span>
                </div>
              </div>

              {/* Expandable Technical Output Details */}
              {(step.outputSummary || step.errorMessage) && (
                <details className="mt-2 pt-2 border-t border-slate-100 group">
                  <summary className="cursor-pointer text-[10px] uppercase tracking-wider font-semibold text-slate-400 hover:text-slate-600 select-none flex items-center justify-between">
                    <span>Technical Details</span>
                    <span className="text-[9px] group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="mt-1.5 text-[11px] leading-relaxed space-y-1">
                    <div className="text-[10px] text-slate-500 font-mono">
                      Tool: {step.toolName}
                    </div>
                    {step.outputSummary && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-200/60 font-mono text-[10px]">
                        {step.outputSummary}
                      </p>
                    )}
                    {step.errorMessage && (
                      <p className="mt-1 text-rose-700 bg-rose-50 p-2 rounded border border-rose-200 text-[11px]">
                        {step.errorMessage}
                      </p>
                    )}
                  </div>
                </details>
              )}
            </div>
          );
        })}

        {/* Running step indicator */}
        {isRunning && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-slate-400 font-semibold text-[11px]">
                {formatSequence(steps.length + 1)}
              </span>
              <div>
                <div className="font-medium text-slate-800">
                  {currentStepName
                    ? humanizeToolName(currentStepName)
                    : "Executing step..."}
                </div>
                <div className="text-[11px] text-slate-400">In progress</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Investigating
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
