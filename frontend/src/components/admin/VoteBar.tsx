import React from "react";
import { Badge } from "@/components/ui/Badge";

export interface VoteBarProps {
  foodName: string;
  votes: number;
  percentage: number;
  isWinner?: boolean;
  rank?: number;
  totalVotes?: number;
}

export function VoteBar({
  foodName,
  votes,
  percentage,
  isWinner = false,
  rank,
  totalVotes,
}: VoteBarProps) {
  const hasVotes = (totalVotes ?? 0) > 0;

  return (
    <div
      className={`space-y-2 p-4 rounded-xl border transition-colors ${
        isWinner && hasVotes
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-slate-100 bg-slate-50/60 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {rank !== undefined && (
            <span
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                isWinner && hasVotes
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {rank}
            </span>
          )}
          <span className="text-sm font-semibold text-slate-900 truncate">
            {foodName}
          </span>
          {isWinner && hasVotes && (
            <Badge variant="success" size="sm" dot>
              Leader
            </Badge>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-bold text-slate-900">{votes}</span>{" "}
          <span className="text-xs text-slate-500">
            vote{votes !== 1 ? "s" : ""} · {percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isWinner && hasVotes ? "bg-emerald-500" : "bg-blue-500"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}
