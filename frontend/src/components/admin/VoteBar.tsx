import React from "react";
import { Badge } from "@/components/ui/Badge";

export interface VoteBarProps {
  foodName: string;
  votes: number;
  percentage: number;
  isWinner?: boolean;
}

export function VoteBar({
  foodName,
  votes,
  percentage,
  isWinner = false,
}: VoteBarProps) {
  return (
    <div className="space-y-1.5 p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-900">{foodName}</span>
          {isWinner && (
            <Badge variant="success" size="sm" dot>
              Current Leader
            </Badge>
          )}
        </div>
        <div className="text-right">
          <span className="font-bold text-slate-900">{votes}</span>{" "}
          <span className="text-xs text-slate-500">
            vote{votes !== 1 ? "s" : ""} ({percentage.toFixed(1)}%)
          </span>
        </div>
      </div>

      <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isWinner ? "bg-emerald-500" : "bg-blue-600"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}
