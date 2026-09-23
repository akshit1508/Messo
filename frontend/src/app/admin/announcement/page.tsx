"use client";

import React, { useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin";
import { ApiError } from "@/types/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

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
        setGeneralError(err.message || "Failed to post announcement. Please check your inputs.");
      } else {
        setGeneralError("An unexpected error occurred while broadcasting the announcement.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Broadcast Announcement"
        description="Publish official notices regarding meal timings, special feasts, holiday kitchen schedules, or maintenance."
      />

      {successMessage && (
        <Alert
          variant="success"
          title="Notice Published"
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
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

      <Card className="border border-gray-200 shadow-xs">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900">
            Announcement Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
                  Notice Title <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-400">
                  {title.length} / 200 characters
                </span>
              </div>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
                placeholder="e.g. Special Diwali Dinner & Feast Timings"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-1 disabled:opacity-50 ${
                  fieldErrors.title
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
              />
              {fieldErrors.title && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">
                  {fieldErrors.title}
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700"
                >
                  Notice Message Body <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-400">
                  {message.length} / 1000 characters
                </span>
              </div>
              <textarea
                id="message"
                name="message"
                rows={6}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={submitting}
                placeholder="Write the full announcement message here..."
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-1 disabled:opacity-50 ${
                  fieldErrors.message
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
              />
              {fieldErrors.message && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">
                  {fieldErrors.message}
                </p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
              <Link href="/admin/dashboard">
                <Button variant="ghost" type="button" disabled={submitting}>
                  Cancel
                </Button>
              </Link>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Broadcasting..." : "Publish Announcement"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
