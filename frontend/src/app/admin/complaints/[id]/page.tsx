"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

export default function ComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
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
        message={error || "Complaint not found"}
        onRetry={fetchComplaint}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={`Complaint Ticket #${complaint.id}`}
        description={`Submitted by ${complaint.userEmail || "Student"} on ${new Date(
          complaint.createdAt
        ).toLocaleString()}`}
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

      <Card className="border border-gray-200 shadow-xs">
        <CardHeader className="pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {complaint.type}
            </span>
            <CardTitle className="text-xl font-bold text-gray-900 mt-2">
              Grievance Details
            </CardTitle>
          </div>
          <Badge variant={complaint.resolved ? "success" : "warning"}>
            {complaint.resolved ? "Resolved Ticket" : "Pending Investigation"}
          </Badge>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-gray-50/70 p-4 rounded-xl border border-gray-100">
            <div>
              <span className="text-gray-500 font-medium">Student Account</span>
              <p className="text-gray-900 font-mono font-medium mt-0.5">
                {complaint.userEmail || "Anonymous"}
              </p>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Submission Timestamp</span>
              <p className="text-gray-900 font-medium mt-0.5">
                {new Date(complaint.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Category Classification</span>
              <p className="text-gray-900 font-medium mt-0.5">{complaint.type}</p>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Student Severity / Meal Rating</span>
              <div className="mt-1">
                {complaint.rating ? (
                  <StarRating value={complaint.rating} disabled size="sm" />
                ) : (
                  <span className="text-gray-400 text-xs">No rating specified</span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Detailed Grievance Narrative
            </h4>
            <div className="p-4 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </div>
          </div>

          {/* Resolution Action Area */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <Link href="/admin/complaints">
              <Button variant="ghost" size="sm">
                &larr; Return to Complaints Log
              </Button>
            </Link>

            {complaint.resolved ? (
              <div className="flex items-center space-x-2 text-emerald-700 text-sm font-semibold">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Ticket Resolved</span>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                disabled={resolving}
                onClick={handleResolve}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {resolving ? "Resolving Ticket..." : "Mark as Resolved"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
