"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { AgentGoalType } from "@/types/agent";

interface AgentStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    goalType: AgentGoalType;
    goalTarget: string;
    goalDescription: string;
  }) => Promise<void>;
  isLoading: boolean;
}

const EXAMPLE_TEMPLATES = [
  {
    label: "Dinner satisfaction drop",
    target: "DINNER_SATISFACTION",
    description: "Investigate why dinner satisfaction dropped this week and identify contributing factors.",
  },
  {
    label: "Breakfast complaint surge",
    target: "BREAKFAST_SERVICE",
    description: "Analyze the recent surge in breakfast complaints and review student feedback patterns.",
  },
  {
    label: "Turnout & food waste risk",
    target: "DINNER_TURNOUT",
    description: "Assess tomorrow's dinner turnout risk and forecast potential food overproduction.",
  },
];

export function AgentStartModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: AgentStartModalProps) {
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!goalDescription.trim()) {
      setError("Please describe the issue or question you want investigated.");
      return;
    }
    try {
      await onSubmit({
        goalType: "INVESTIGATE_OPERATIONAL_ISSUE",
        goalTarget: goalTarget.trim() || "GENERAL_OPERATIONS",
        goalDescription: goalDescription.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to start investigation");
    }
  };

  const handleApplyTemplate = (tpl: typeof EXAMPLE_TEMPLATES[0]) => {
    setGoalDescription(tpl.description);
    setGoalTarget(tpl.target);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="presentation"
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-modal-title"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 id="agent-modal-title" className="text-sm font-bold uppercase tracking-wider text-slate-900">
              START INVESTIGATION
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Launch an evidence-gathering investigation for administrator review.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md text-sm leading-none focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Primary Prompt Input */}
          <div>
            <label
              htmlFor="agent-goal-input"
              className="block text-xs font-semibold text-slate-800 mb-1"
            >
              What should the Agent investigate?
            </label>
            <Textarea
              id="agent-goal-input"
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              rows={3}
              placeholder="Investigate why dinner satisfaction dropped this week."
              disabled={isLoading}
              required
              className="text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Describe the operational question or observed pattern to explore.
            </p>
          </div>

          {/* Example Suggestions */}
          <div>
            <span className="block text-[11px] font-medium text-slate-500 mb-1.5">
              Example investigation goals:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  disabled={isLoading}
                  className="px-2.5 py-1 text-[11px] rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors border border-slate-200/60"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Target Input */}
          <div>
            <label
              htmlFor="agent-target-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Target entity or meal <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Input
              id="agent-target-input"
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              placeholder="e.g. DINNER_SATISFACTION, Rajma, or Breakfast"
              disabled={isLoading}
              className="text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium"
            >
              Start Investigation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
