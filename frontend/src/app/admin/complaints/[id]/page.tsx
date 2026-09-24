"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/admin";
import { formatErrorMessage } from "@/lib/error";
import { ComplaintResponse } from "@/types/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { StarRating } from "@/components/student/StarRating";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  FOOD_QUALITY: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  HYGIENE: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  FACILITY: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  STAFF: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  OTHER: { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" },
};

export default function ComplaintDetailPage() {
  const params = useParams();
  const id = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<ComplaintResponse | null>(null);

  const [resolving, setResolving] = useState(false);
  const [resolveSuccess, setResolveSuccess] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const fetchComplaint = useCallback(async () => {
    if (!id || isNaN(id)) {
      setError("Invalid complaint ticket ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getComplaint(id);
      setComplaint(data);
    } catch (err) {
      setError(formatErrorMessage(err, `Failed to load complaint #${id}`));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  const handleResolve = async () => {
    if (!id) return;
    setResolving(true);
    setResolveSuccess(null);
    setResolveError(null);

    try {
      const response = await adminApi.resolveComplaint(id);
      setResolveSuccess(
        response.message || "Complaint resolved. An update notification has been sent to the student."
      );
      setComplaint((prev) => (prev ? { ...prev, resolved: true } : null));
    } catch (err) {
      setResolveError(formatErrorMessage(err, "Failed to resolve complaint"));
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" text={`Loading complaint ticket #${id}...`} />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <ErrorState
        message={error || "Complaint ticket could not be found"}
        onRetry={fetchComplaint}
      />
    );
  }

  const catStyle = CATEGORY_COLORS[complaint.type] || CATEGORY_COLORS.OTHER;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={`Complaint Ticket #${complaint.id}`}
        description={`Submitted by ${complaint.userEmail || "Student"} on ${new Date(
          complaint.createdAt
        ).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}`}
        action={
          <Link href="/admin/complaints">
            <Button variant="outline" size="sm">
              &larr; Back to Complaints
            </Button>
          </Link>
        }
      />

      {resolveSuccess && (
        <Alert
          variant="success"
          title="Resolution Confirmed"
          onClose={() => setResolveSuccess(null)}
        >
          {resolveSuccess}
        </Alert>
      )}

      {resolveError && (
        <Alert
          variant="danger"
          title="Action Failed"
          onClose={() => setResolveError(null)}
        >
          {resolveError}
        </Alert>
      )}

      <Card className="border border-slate-200/90 shadow-xs">
        <CardHeader className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <span
              className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
            >
              {complaint.type}
            </span>
            <CardTitle className="text-lg font-bold text-slate-900 mt-1">
              Grievance Record
            </CardTitle>
          </div>
          <Badge variant={complaint.resolved ? "success" : "warning"} dot>
            {complaint.resolved ? "Resolved Ticket" : "Pending Investigation"}
          </Badge>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Student Account
              </span>
              <p className="text-slate-900 font-mono text-xs font-medium">
                {complaint.userEmail || "Anonymous"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Submission Timestamp
              </span>
              <p className="text-slate-900 text-xs font-medium">
                {new Date(complaint.createdAt).toLocaleString(undefined, {
                  dateStyle: "full",
                  timeStyle: "medium",
                })}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Category Classification
              </span>
              <p className="text-slate-900 text-xs font-semibold">{complaint.type}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Student Severity / Meal Rating
              </span>
              <div className="mt-0.5 flex items-center gap-2">
                {complaint.rating ? (
                  <>
                    <StarRating value={complaint.rating} disabled size="sm" />
                    <span className="text-xs font-bold text-slate-700">
                      {complaint.rating} / 5
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400 text-xs">No rating specified</span>
                )}
              </div>
            </div>
          </div>

          {/* Description Narrative */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Detailed Grievance Narrative
            </h4>
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-normal shadow-xs">
              {complaint.description}
            </div>
          </div>

          {/* Resolution Status / Action Area */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Link href="/admin/complaints">
              <Button variant="ghost" size="sm">
                &larr; Return to Complaints Log
              </Button>
            </Link>

            {complaint.resolved ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>This ticket has been marked as resolved</span>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                disabled={resolving}
                onClick={handleResolve}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {resolving ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Resolving Ticket…
                  </span>
                ) : (
                  "Mark as Resolved"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
