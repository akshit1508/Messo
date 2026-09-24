"use client";

import React, { useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin";
import { ApiError } from "@/types/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default function PostAnnouncementPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = "Announcement title is required";
    } else if (title.trim().length > 200) {
      errors.title = "Title cannot exceed 200 characters";
    }

    if (!message.trim()) {
      errors.message = "Announcement message is required";
    } else if (message.trim().length > 1000) {
      errors.message = "Message cannot exceed 1000 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await adminApi.createAnnouncement({
        title: title.trim(),
        message: message.trim(),
      });

      setSuccessMessage(
        response.message || "Announcement broadcasted successfully to all hostel students!"
      );
      // Reset form
      setTitle("");
      setMessage("");
      setFieldErrors({});
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && err.details.length > 0) {
          const errors: Record<string, string> = {};
          err.details.forEach((item) => {
            const colonIdx = item.indexOf(":");
            if (colonIdx !== -1) {
              const field = item.substring(0, colonIdx).trim();
              const msg = item.substring(colonIdx + 1).trim();
              errors[field] = msg;
            }
          });
          setFieldErrors(errors);
        }
        setGeneralError(err.message || "Failed to post announcement. Please verify your inputs.");
      } else {
        setGeneralError("An unexpected error occurred while broadcasting the announcement.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = title.trim().length > 0 && message.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Broadcast Announcement"
        description="Publish official notices regarding meal timings, special feasts, holiday schedules, or facility maintenance."
        action={
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm">
              Dashboard &rarr;
            </Button>
          </Link>
        }
      />

      {successMessage && (
        <Alert
          variant="success"
          title="Notice Published"
          onClose={() => setSuccessMessage(null)}
        >
          <div className="space-y-2">
            <p>{successMessage}</p>
            <div className="pt-1">
              <Link href="/admin/dashboard" className="font-semibold underline text-xs">
                Return to Admin Control Center &rarr;
              </Link>
            </div>
          </div>
        </Alert>
      )}

      {generalError && (
        <Alert
          variant="danger"
          title="Publishing Error"
          onClose={() => setGeneralError(null)}
        >
          {generalError}
        </Alert>
      )}

      <Card className="border border-slate-200/90 shadow-xs">
        <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">
            Circular Details
          </CardTitle>
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
            Broadcast to all students
          </span>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                  Notice Title <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">
                  {title.length} / 200
                </span>
              </div>
              <input
                id="title"
                name="title"
                type="text"
                required
                maxLength={200}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (fieldErrors.title) {
                    setFieldErrors((prev) => ({ ...prev, title: "" }));
                  }
                }}
                disabled={submitting}
                placeholder="e.g. Special Festival Dinner & Extended Dining Timings"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 bg-white shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${
                  fieldErrors.title
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/20"
                }`}
              />
              {fieldErrors.title && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldErrors.title}</p>
              )}
            </div>

            {/* Message Body */}
            <div>
              <Textarea
                id="message"
                name="message"
                label="Announcement Message Body"
                required
                rows={6}
                maxLength={1000}
                showCount
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (fieldErrors.message) {
                    setFieldErrors((prev) => ({ ...prev, message: "" }));
                  }
                }}
                disabled={submitting}
                placeholder="Provide detailed instructions regarding the event, menu changes, schedule adjustments, or facility updates…"
                error={fieldErrors.message}
                helperText="Students will see this notice on their dashboard and announcements feed."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Link href="/admin/dashboard">
                <Button variant="ghost" type="button" disabled={submitting}>
                  Cancel
                </Button>
              </Link>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting || !isFormValid}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Broadcasting…
                  </span>
                ) : (
                  "Publish Announcement"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Guidance Note */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 text-xs text-slate-600 space-y-2">
        <p className="font-semibold text-slate-800 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Broadcast Guidelines
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-500">
          <li>Announcements are instantly visible to all authenticated students upon publishing.</li>
          <li>Students can dismiss announcements once read, but they remain archived in their feed.</li>
          <li>For critical schedule changes, ensure timings and meal types are explicitly stated.</li>
        </ul>
      </div>
    </div>
  );
}
