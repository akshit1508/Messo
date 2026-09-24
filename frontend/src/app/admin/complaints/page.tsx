"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin";
import { formatErrorMessage } from "@/lib/error";
import { ComplaintResponse } from "@/types/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  FOOD_QUALITY: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  HYGIENE: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  FACILITY: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  STAFF: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  OTHER: { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" },
};

export default function AdminComplaintsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([]);

  // Filtering states
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "RESOLVED">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchComplaints = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await adminApi.getComplaints();
      setComplaints(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load student complaints"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await adminApi.resolveComplaint(id);
      setActionSuccess(res.message || `Complaint #${id} has been marked as resolved.`);
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, resolved: true } : c))
      );
    } catch (err) {
      setActionError(formatErrorMessage(err, `Failed to resolve complaint #${id}`));
    } finally {
      setResolvingId(null);
    }
  };

  // Metrics
  const totalCount = complaints.length;
  const pendingCount = useMemo(() => complaints.filter((c) => !c.resolved).length, [complaints]);
  const resolvedCount = useMemo(() => complaints.filter((c) => c.resolved).length, [complaints]);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    complaints.forEach((c) => {
      if (c.type) set.add(c.type);
    });
    return Array.from(set).sort();
  }, [complaints]);

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Status filter
      if (statusFilter === "PENDING" && c.resolved) return false;
      if (statusFilter === "RESOLVED" && !c.resolved) return false;

      // Category filter
      if (categoryFilter !== "ALL" && c.type !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = c.description?.toLowerCase().includes(query);
        const matchesEmail = c.userEmail?.toLowerCase().includes(query);
        const matchesId = String(c.id).includes(query);
        const matchesType = c.type?.toLowerCase().includes(query);
        if (!matchesDesc && !matchesEmail && !matchesId && !matchesType) return false;
      }

      return true;
    });
  }, [complaints, statusFilter, categoryFilter, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" text="Loading student grievances..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => fetchComplaints()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Complaints Management"
        description="Inspect hygiene, food quality, and dining facility grievances reported by hostel students."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchComplaints(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Refreshing…
                </span>
              ) : (
                "Refresh"
              )}
            </Button>
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard &rarr;
              </Button>
            </Link>
          </div>
        }
      />

      {/* Notifications */}
      {actionSuccess && (
        <Alert
          variant="success"
          title="Resolution Confirmed"
          onClose={() => setActionSuccess(null)}
        >
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert
          variant="danger"
          title="Resolution Error"
          onClose={() => setActionError(null)}
        >
          {actionError}
        </Alert>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Grievances
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Logged across all terms</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Pending Resolution
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{pendingCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Require mess administrative action</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Resolved Tickets
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{resolvedCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalCount > 0 ? `${Math.round((resolvedCount / totalCount) * 100)}% resolution rate` : "0% resolution rate"}
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === "PENDING"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("RESOLVED")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === "RESOLVED"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-lg md:ml-auto">
            {/* Category Select */}
            <div className="relative shrink-0">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-xs font-medium text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter by category"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket #, student, description…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 pl-9 text-xs text-slate-900 placeholder-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search query"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active filter summary pill bar */}
        {(statusFilter !== "ALL" || categoryFilter !== "ALL" || searchQuery) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing filtered results ({filteredComplaints.length} of {totalCount})</span>
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setCategoryFilter("ALL");
                setSearchQuery("");
              }}
              className="text-blue-600 hover:underline font-medium ml-auto"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Complaints Table or Empty State */}
      {filteredComplaints.length === 0 ? (
        <EmptyState
          title={
            searchQuery || categoryFilter !== "ALL"
              ? "No Matching Complaints"
              : statusFilter === "PENDING"
              ? "No Pending Complaints"
              : statusFilter === "RESOLVED"
              ? "No Resolved Complaints"
              : "No Complaints Registered"
          }
          description={
            searchQuery || categoryFilter !== "ALL"
              ? "No complaints match your active filter and search terms. Try adjusting your query."
              : "There are currently no tickets matching this view."
          }
          actionText={
            searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
              ? "Clear All Filters"
              : undefined
          }
          onAction={
            searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
              ? () => {
                  setStatusFilter("ALL");
                  setCategoryFilter("ALL");
                  setSearchQuery("");
                }
              : undefined
          }
        />
      ) : (
        <Card className="border border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-6 bg-slate-50/80 border-b border-slate-200 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800">
              Complaints Log
            </CardTitle>
            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredComplaints.length} record{filteredComplaints.length !== 1 ? "s" : ""}
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Ticket</th>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Grievance Narrative</th>
                  <th className="px-5 py-3.5">Rating</th>
                  <th className="px-5 py-3.5">Date Logged</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredComplaints.map((item) => {
                  const catStyle = CATEGORY_COLORS[item.type] || CATEGORY_COLORS.OTHER;
                  const isResolving = resolvingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* ID */}
                      <td className="px-5 py-4 font-mono text-xs font-bold text-slate-600 whitespace-nowrap">
                        #{item.id}
                      </td>

                      {/* Student */}
                      <td className="px-5 py-4 text-xs">
                        <div className="font-medium text-slate-900 truncate max-w-[140px]">
                          {item.userEmail || "Anonymous"}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="px-5 py-4 text-xs whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {item.type}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-5 py-4 text-xs text-slate-600 max-w-xs md:max-w-md">
                        <p className="line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </td>

                      {/* Rating */}
                      <td className="px-5 py-4 text-xs whitespace-nowrap">
                        {item.rating ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60">
                            ★ {item.rating}/5
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-xs whitespace-nowrap">
                        <Badge variant={item.resolved ? "success" : "warning"} dot>
                          {item.resolved ? "Resolved" : "Pending"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-xs text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/admin/complaints/${item.id}`}>
                            <Button variant="ghost" size="sm" className="text-xs h-7 px-2.5">
                              View
                            </Button>
                          </Link>
                          {!item.resolved && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isResolving}
                              onClick={() => handleResolve(item.id)}
                              className="text-xs h-7 px-2.5 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 border-slate-200"
                            >
                              {isResolving ? (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                  </svg>
                                  …
                                </span>
                              ) : (
                                "Resolve"
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
