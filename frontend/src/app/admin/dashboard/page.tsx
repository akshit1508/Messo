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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Control Center"
        description="Mess operations overview, grievance resolution metrics, and menu voting oversight."
        action={
          <div className="flex items-center space-x-2">
            <Badge variant={metrics?.pollActive ? "success" : "neutral"}>
              {metrics?.pollActive ? "Active Poll Running" : "No Active Poll"}
            </Badge>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Complaints"
          value={metrics?.totalComplaints ?? 0}
          subtitle="All grievances registered"
          variant="default"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />

        <KpiCard
          title="Pending Complaints"
          value={metrics?.pendingComplaints ?? 0}
          subtitle="Awaiting administration action"
          variant="warning"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <KpiCard
          title="Resolved Complaints"
          value={metrics?.resolvedComplaints ?? 0}
          subtitle="Successfully addressed tickets"
          variant="success"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <KpiCard
          title="Tomorrow's Menu Poll"
          value={metrics?.pollActive ? "Active" : "Closed"}
          subtitle={metrics?.pollActive ? "Students actively voting" : "No live ballot"}
          variant={metrics?.pollActive ? "success" : "default"}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Operational Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/create-poll"
            className="p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              Create Menu Poll
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Configure candidate food items for student voting.
            </p>
          </Link>

          <Link
            href="/admin/poll-results"
            className="p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              View Poll Results & Publish
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Inspect vote tallies and publish the winning menu.
            </p>
          </Link>

          <Link
            href="/admin/complaints"
            className="p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              Review Complaints
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Investigate feedback and resolve student tickets.
            </p>
          </Link>

          <Link
            href="/admin/announcement"
            className="p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              Post Announcement
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Broadcast mess notices, timings, and feast circulars.
            </p>
          </Link>

          <Link
            href="/admin/ratings"
            className="p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              Food Rating Analytics
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Inspect dining satisfaction and review counts by food item.
            </p>
          </Link>
        </div>
      </div>

      {/* Information Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Health & Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 font-medium">Authentication Protocol</p>
              <p className="text-gray-900 font-medium mt-0.5">Spring Security HTTP-only Session Cookie</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">CSRF State</p>
              <p className="text-emerald-700 font-medium mt-0.5 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Active Double-Submit Token Enforcement</span>
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Student Interaction Layer</p>
              <p className="text-gray-900 font-medium mt-0.5">Live REST APIs (Zero LLM/AI Dependencies)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
