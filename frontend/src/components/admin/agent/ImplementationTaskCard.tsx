"use client";

import React, { useState } from "react";
import { AgentImplementationTaskResponse } from "@/types/agent";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { humanizeTaskStatus } from "@/lib/agentDisplay";

interface ImplementationTaskCardProps {
  task: AgentImplementationTaskResponse;
  onStart: (taskId: number) => Promise<void>;
  onComplete: (taskId: number) => Promise<void>;
  onCancel?: (taskId: number, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export function ImplementationTaskCard({
  task,
  onStart,
  onComplete,
  onCancel,
  isLoading = false,
}: ImplementationTaskCardProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOpen = task.status === "OPEN";
  const isInProgress = task.status === "IN_PROGRESS";
  const isReadyForVerification = task.status === "READY_FOR_VERIFICATION";
  const isCompleted = task.status === "COMPLETED";
  const isCancelled = task.status === "CANCELLED";

  const handleStart = async () => {
    setActionError(null);
    setIsSubmitting(true);
    try {
      await onStart(task.id);
    } catch (err: any) {
      setActionError(err?.message || "Failed to start task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setActionError(null);
    setIsSubmitting(true);
    try {
      await onComplete(task.id);
    } catch (err: any) {
      setActionError(err?.message || "Failed to complete task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      await onCancel(task.id, "Cancelled by mess administrator");
    } catch (err: any) {
      setActionError(err?.message || "Failed to cancel task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isLoading || isSubmitting;

  return (
    <Card className="border border-slate-200/90 shadow-2xs">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/70 uppercase tracking-wider">
                IMPLEMENTATION TASK
              </span>
              <CardTitle className="text-sm font-bold text-slate-900">
                Task #{task.id}: {task.title}
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Human-assigned action items generated from approved recommendation
            </p>
          </div>

          <Badge
            variant={
              isCompleted
                ? "success"
                : isReadyForVerification
                ? "warning"
                : isInProgress
                ? "info"
                : isOpen
                ? "warning"
                : "neutral"
            }
            size="sm"
          >
            {humanizeTaskStatus(task.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 text-xs text-slate-700">
        {actionError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center justify-between">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Phase 8: ACTION APPLIED (BEFORE -> AFTER result) */}
        {(task.beforeValue || isReadyForVerification) && (
          <div className="p-3.5 bg-slate-900 text-slate-100 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isCompleted ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  ACTION APPLIED TO OPERATIONAL DATABASE
                </span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                isCompleted
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                  : "bg-amber-950/80 text-amber-300 border-amber-800"
              }`}>
                {isCompleted ? "Verified & Completed" : "Ready for verification"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700/60">
                <span className="text-[10px] font-semibold text-rose-300 uppercase tracking-wider block mb-1">
                  BEFORE (Previous Menu)
                </span>
                <span className="text-sm font-bold text-slate-100 block">
                  {task.mealType ? `${task.mealType.charAt(0).toUpperCase() + task.mealType.slice(1).toLowerCase()} • ` : ""}
                  {task.beforeValue || "Aloo Gobi"}
                </span>
                {task.targetDate && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Target Date: {task.targetDate}
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded bg-slate-800/80 border border-emerald-700/50">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                  AFTER (Approved Action)
                </span>
                <span className="text-sm font-bold text-emerald-300 block">
                  {task.mealType ? `${task.mealType.charAt(0).toUpperCase() + task.mealType.slice(1).toLowerCase()} • ` : ""}
                  {task.afterValue || "Paneer Bhurji"}
                </span>
                {task.targetDate && (
                  <span className="text-[10px] text-emerald-400/80 block mt-0.5">
                    Target Date: {task.targetDate}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
              <div>
                <span>Executed by: </span>
                <strong className="text-slate-200">{task.executedBy || "MESO AI Operations Agent"}</strong>
              </div>
              {task.executedAt && (
                <div>
                  <span>Executed at: </span>
                  <strong className="text-slate-300">{new Date(task.executedAt).toLocaleString()}</strong>
                </div>
              )}
            </div>

            <p className="text-[10.5px] text-slate-400 italic">
              The approved menu change was applied to the operational database. Please verify the kitchen schedule and mark the task completed.
            </p>
          </div>
        )}

        {/* Task Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">
              Target
            </span>
            <span className="text-slate-800 font-medium">{task.target}</span>
          </div>

          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">
              Source Recommendation
            </span>
            <span className="text-slate-800 font-medium">
              Recommendation #{task.recommendationId}
            </span>
          </div>
        </div>

        <div>
          <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">
            Operational Action Plan
          </span>
          <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200/70">
            {task.description}
          </p>
        </div>

        {task.reason && (
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">
              Context & Rationale
            </span>
            <p className="text-slate-600 italic">{task.reason}</p>
          </div>
        )}

        {/* Operational Scope Notice */}
        <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg text-slate-600 space-y-1 text-[11px]">
          <div className="font-semibold text-amber-900 flex items-center gap-1.5">
            <span>Notice: Human Verification & Oversight</span>
          </div>
          <p className="leading-relaxed">
            {task.beforeValue || isReadyForVerification
              ? "The operational change has been executed. An administrator must verify the change and click 'Mark as Completed' to conclude this task."
              : "Operational changes must be made directly in Menu Management by the mess committee. This task tracks operational execution."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {isOpen && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleStart}
                disabled={disabled}
                className="bg-sky-700 hover:bg-sky-800 text-white font-medium px-4 py-1.5"
              >
                {disabled ? "Starting..." : "Start Task"}
              </Button>
              {onCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={disabled}
                  className="text-slate-600 hover:bg-slate-50"
                >
                  Cancel Task
                </Button>
              )}
            </div>
          )}

          {isInProgress && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleComplete}
                disabled={disabled}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-4 py-1.5"
              >
                {disabled ? "Completing..." : "Mark as Completed"}
              </Button>
              {onCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={disabled}
                  className="text-slate-600 hover:bg-slate-50"
                >
                  Cancel Task
                </Button>
              )}
            </div>
          )}

          {isReadyForVerification && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleComplete}
                disabled={disabled}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-4 py-1.5 shadow-xs"
              >
                {disabled ? "Completing..." : "Mark as Completed"}
              </Button>
              {onCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={disabled}
                  className="text-slate-600 hover:bg-slate-50"
                >
                  Cancel Task
                </Button>
              )}
            </div>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200 text-xs font-medium">
              <span>✓ This task has been verified and completed by the operational team.</span>
            </div>
          )}

          {isCancelled && (
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 text-xs font-medium">
              <span>This task was cancelled.</span>
            </div>
          )}

          <div className="text-[11px] text-slate-500 ml-auto">
            <span>Status: </span>
            <strong className="text-slate-700">{humanizeTaskStatus(task.status)}</strong>
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500">
          <div>
            <span>Prepared by <strong>{task.createdBy}</strong></span>
            {task.createdAt && (
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Created: {new Date(task.createdAt).toLocaleString()}
              </span>
            )}
          </div>
          <div className="sm:text-right">
            {task.completedBy ? (
              <div>
                <span>Completed by <strong>{task.completedBy}</strong></span>
                {task.completedAt && (
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    {new Date(task.completedAt).toLocaleString()}
                  </span>
                )}
              </div>
            ) : (
              <span>Pending human completion</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
