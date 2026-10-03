"use client";

import React from "react";
import { AgentRecommendationResponse } from "@/types/agent";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface RecommendationResultCardProps {
  recommendation: AgentRecommendationResponse;
}

export function RecommendationResultCard({
  recommendation,
}: RecommendationResultCardProps) {
  return (
    <Card className="border border-slate-200/90 shadow-2xs">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">
                Action Executed
              </span>
              <CardTitle className="text-sm font-bold text-slate-900">
                RECOMMENDATION CREATED
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Administrative proposal persisted for mess management review.
            </p>
          </div>
          <Badge variant="warning" size="sm">
            {recommendation.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3.5 text-xs text-slate-700">
        <div>
          <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">
            Title
          </span>
          <p className="text-slate-900 font-semibold">{recommendation.title}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">
              Action Type
            </span>
            <span className="text-slate-800 font-medium">
              {recommendation.recommendationType?.replace(/_/g, " ")}
            </span>
          </div>

          {recommendation.suggestedTarget && (
            <div>
              <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">
                Target Entity
              </span>
              <span className="text-slate-800 font-mono">
                {recommendation.suggestedTarget}
              </span>
            </div>
          )}
        </div>

        <div>
          <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">
            Recommendation
          </span>
          <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200/70">
            {recommendation.description}
          </p>
        </div>

        {recommendation.rationale && (
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">
              Rationale
            </span>
            <p className="text-slate-600 italic">
              {recommendation.rationale}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          <div>
            <span>Created by Agent: </span>
            <span className="font-medium text-slate-700">{recommendation.createdBy}</span>
          </div>
          <div className="sm:text-right">
            <span>Created at: </span>
            <span className="font-medium text-slate-700">
              {new Date(recommendation.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Technical Details Disclosure */}
        <details className="pt-2 border-t border-slate-100 group">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider font-semibold text-slate-400 hover:text-slate-600 select-none flex items-center justify-between">
            <span>Technical Details</span>
            <span className="text-[9px] group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="mt-1.5 p-2 bg-slate-50 rounded border border-slate-200/60 font-mono text-[10px] text-slate-600 space-y-0.5">
            <div>Recommendation ID: #{recommendation.id}</div>
            <div>Associated Agent Run ID: #{recommendation.agentRunId}</div>
            <div>Status Value: {recommendation.status}</div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
