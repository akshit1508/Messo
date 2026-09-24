"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin";
import { formatErrorMessage } from "@/lib/error";
import { AdminDashboardResponse } from "@/types/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { KpiCard } from "@/components/admin/KpiCard";

// ─── Icon helpers ─────────────────────────────────────────────────────────────
function InboxIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

// ─── Quick-action card ────────────────────────────────────────────────────────
interface QuickActionProps {
  href: string;
  label: string;
  description: string;
  iconBg: string;
  iconText: string;
  icon: React.ReactNode;
}

function QuickAction({ href, label, description, iconBg, iconText, icon }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all duration-200"
    >
      <div className={`w-10 h-10 rounded-lg ${iconBg} ${iconText} flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform duration-200`}>
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
        {label}
      </p>
      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>
    </Link>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AdminDashboardResponse | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDashboard();
      setMetrics(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load admin metrics"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" text="Loading admin control center..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchMetrics} />;
  }

  const resolutionRate =
    metrics && metrics.totalComplaints > 0
      ? Math.round((metrics.resolvedComplaints / metrics.totalComplaints) * 100)
      : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Control Center"
        description="Mess operations overview, grievance resolution metrics, and menu voting oversight."
        action={
          <div className="flex items-center gap-2">
            <Badge variant={metrics?.pollActive ? "success" : "neutral"} dot>
              {metrics?.pollActive ? "Active Poll Running" : "No Active Poll"}
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchMetrics}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Complaints"
          value={metrics?.totalComplaints ?? 0}
          subtitle="All grievances registered"
          variant="default"
          icon={<InboxIcon />}
        />
        <KpiCard
          title="Pending"
          value={metrics?.pendingComplaints ?? 0}
          subtitle="Awaiting resolution"
          variant="warning"
          icon={<ClockIcon />}
        />
        <KpiCard
          title="Resolved"
          value={metrics?.resolvedComplaints ?? 0}
          subtitle="Successfully addressed"
          variant="success"
          icon={<CheckCircleIcon />}
        />
        <KpiCard
          title="Menu Poll"
          value={metrics?.pollActive ? "Active" : "Closed"}
          subtitle={metrics?.pollActive ? "Students actively voting" : "No live ballot"}
          variant={metrics?.pollActive ? "success" : "default"}
          icon={<ChartBarIcon />}
        />
      </div>

      {/* ── Resolution Indicator ──────────────────────────────────────────── */}
      {resolutionRate !== null && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Complaint Resolution Rate
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {resolutionRate}%
              </p>
            </div>
            <Badge
              variant={
                resolutionRate >= 80
                  ? "success"
                  : resolutionRate >= 50
                  ? "warning"
                  : "danger"
              }
            >
              {resolutionRate >= 80
                ? "Healthy"
                : resolutionRate >= 50
                ? "Moderate"
                : "Needs attention"}
            </Badge>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                resolutionRate >= 80
                  ? "bg-emerald-500"
                  : resolutionRate >= 50
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${resolutionRate}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {metrics?.resolvedComplaints} of {metrics?.totalComplaints} complaints resolved
          </p>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Operational Actions</h3>
          <p className="text-xs text-slate-500 mt-0.5">Navigate to a module to manage mess operations.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction
            href="/admin/create-poll"
            label="Create Menu Poll"
            description="Configure candidate food items for student voting."
            iconBg="bg-blue-50"
            iconText="text-blue-600"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <QuickAction
            href="/admin/poll-results"
            label="View Poll Results & Publish"
            description="Inspect vote tallies and publish the winning menu."
            iconBg="bg-indigo-50"
            iconText="text-indigo-600"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <QuickAction
            href="/admin/complaints"
            label="Review Complaints"
            description="Investigate feedback and resolve student tickets."
            iconBg="bg-amber-50"
            iconText="text-amber-600"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
          <QuickAction
            href="/admin/announcement"
            label="Post Announcement"
            description="Broadcast mess notices, timings, and circulars."
            iconBg="bg-purple-50"
            iconText="text-purple-600"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            }
          />
          <QuickAction
            href="/admin/ratings"
            label="Food Rating Analytics"
            description="Inspect dining satisfaction and review counts by food item."
            iconBg="bg-emerald-50"
            iconText="text-emerald-600"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* ── System Health ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="text-base">System Health &amp; Compliance</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Authentication Protocol
              </p>
              <p className="text-slate-900 font-medium">
                Spring Security HTTP-only Session Cookie
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                CSRF State
              </p>
              <p className="text-emerald-700 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                Double-Submit Token Active
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Student Interaction Layer
              </p>
              <p className="text-slate-900 font-medium">
                Live REST APIs (Zero AI Dependencies)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
