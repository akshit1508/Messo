"use client";

import React, { useEffect, useState, useCallback } from "react";
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

export default function AdminComplaintsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([]);

  const [filter, setFilter] = useState<"ALL" | "PENDING" | "RESOLVED">("ALL");
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getComplaints();
      setComplaints(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load student complaints"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    setActionSuccess(null);
    try {
      await adminApi.resolveComplaint(id);
      setActionSuccess(`Complaint #${id} has been marked as resolved.`);
      // Update local state
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, resolved: true } : c))
      );
    } catch (err) {
      alert(formatErrorMessage(err, "Failed to mark complaint as resolved"));
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" text="Loading student grievances..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchComplaints} />;
  }

  const filteredComplaints = complaints.filter((c) => {
    if (filter === "PENDING") return !c.resolved;
    if (filter === "RESOLVED") return c.resolved;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Complaints Management"
        description="Inspect hygiene, food quality, and dining facility grievances reported by hostel students."
        action={
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              Total: <strong>{complaints.length}</strong>
            </span>
            <Button variant="outline" size="sm" onClick={fetchComplaints}>
              Refresh
            </Button>
          </div>
        }
      />

      {actionSuccess && (
        <Alert
          variant="success"
          title="Resolution Confirmed"
          onClose={() => setActionSuccess(null)}
        >
          {actionSuccess}
        </Alert>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === "ALL"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          All Complaints ({complaints.length})
        </button>
        <button
          onClick={() => setFilter("PENDING")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === "PENDING"
              ? "bg-amber-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Pending ({complaints.filter((c) => !c.resolved).length})
        </button>
        <button
          onClick={() => setFilter("RESOLVED")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === "RESOLVED"
              ? "bg-emerald-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Resolved ({complaints.filter((c) => c.resolved).length})
        </button>
      </div>

      {filteredComplaints.length === 0 ? (
        <EmptyState
          title={
            filter === "PENDING"
              ? "No Pending Complaints"
              : filter === "RESOLVED"
              ? "No Resolved Complaints"
              : "No Complaints Registered"
          }
          description="There are currently no tickets matching the selected filter criteria."
        />
      ) : (
        <Card className="border border-gray-200 shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-6 bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Complaints Log
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50/70 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Rating</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredComplaints.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 font-semibold">
                      #{item.id}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-900">
                      {item.userEmail || "Anonymous"}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="inline-block px-2 py-0.5 rounded font-semibold bg-gray-100 text-gray-800">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-900">
                      {item.rating ? (
                        <span className="font-semibold text-amber-600">
                          ★ {item.rating}/5
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs whitespace-nowrap">
                      <Badge variant={item.resolved ? "success" : "warning"}>
                        {item.resolved ? "Resolved" : "Pending"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-right whitespace-nowrap space-x-2">
                      <Link href={`/admin/complaints/${item.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Details
                        </Button>
                      </Link>
                      {!item.resolved && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={resolvingId === item.id}
                          onClick={() => handleResolve(item.id)}
                          className="text-xs text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                        >
                          {resolvingId === item.id ? "Resolving..." : "Resolve"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
