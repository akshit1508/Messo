"use client";

import React, { useState, useId } from "react";
import Link from "next/link";
import { studentApi } from "@/lib/student";
import { ApiError } from "@/types/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { StarRating } from "@/components/student/StarRating";

const COMPLAINT_TYPES = [
  { value: "FOOD_QUALITY", label: "Food Quality / Taste / Freshness" },
  { value: "HYGIENE", label: "Mess Hygiene & Cleanliness" },
  { value: "TIMELINESS", label: "Meal Timings & Serving Delay" },
  { value: "FACILITY", label: "Dining Hall Facilities / Utensils / Seating" },
  { value: "STAFF_BEHAVIOR", label: "Staff Behavior & Service" },
  { value: "OTHER", label: "Other Dining Grievance" },
];

export default function ComplaintPage() {
  const [complaintType, setComplaintType] = useState<string>("FOOD_QUALITY");
  const [description, setDescription] = useState<string>("");
  const [rating, setRating] = useState<number>(0);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const categorySelectId = useId();
  const descriptionTextareaId = useId();

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!complaintType.trim()) {
      errors.type = "Complaint category is required";
    }

    if (!description.trim()) {
      errors.description = "Description is required";
    } else if (description.trim().length < 5) {
      errors.description = "Description must be at least 5 characters long";
    } else if (description.trim().length > 1000) {
      errors.description = "Description cannot exceed 1000 characters";
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
      const response = await studentApi.submitComplaint({
        type: complaintType,
        description: description.trim(),
        rating: rating > 0 ? rating : undefined,
      });

      setSuccessMessage(
        response.message || "Your complaint has been submitted. The mess administration will review it."
      );
      // Reset form fields on successful submission
      setComplaintType("FOOD_QUALITY");
      setDescription("");
      setRating(0);
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
        setGeneralError(err.message || "Failed to submit complaint. Please check your inputs.");
      } else {
        setGeneralError("An unexpected error occurred while submitting your grievance.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Submit a Complaint"
        description="Tell the mess team about an issue so it can be reviewed."
        action={
          <div className="flex items-center gap-2">
            <Link href="/student/dashboard">
              <Button variant="ghost" size="sm" className="text-xs">
                &larr; Dashboard
              </Button>
            </Link>
          </div>
        }
      />

      {/* Success Notification Alert */}
      {successMessage && (
        <Alert
          variant="success"
          title="Complaint Submitted Successfully"
          onClose={() => setSuccessMessage(null)}
        >
          <div className="space-y-1">
            <p>{successMessage}</p>
            <p className="text-xs text-emerald-800/80">
              When administration resolves your grievance, an update will appear in your dashboard notifications.
            </p>
          </div>
        </Alert>
      )}

      {/* General Submission Error Alert */}
      {generalError && (
        <Alert
          variant="danger"
          title="Submission Failed"
          onClose={() => setGeneralError(null)}
        >
          {generalError}
        </Alert>
      )}

      {/* Complaint Submission Card */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Grievance Submission
            </span>
            <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
              Lodge Issue or Feedback
            </CardTitle>
            <p className="text-xs text-slate-500">
              All submissions are logged and reviewed directly by the mess administration committee.
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Category Select */}
            <div>
              <Select
                id={categorySelectId}
                name="complaintType"
                label="Complaint Category"
                required
                value={complaintType}
                onChange={(e) => {
                  setComplaintType(e.target.value);
                  if (fieldErrors.type) {
                    setFieldErrors((prev) => ({ ...prev, type: "" }));
                  }
                }}
                disabled={submitting}
                options={COMPLAINT_TYPES}
                error={fieldErrors.type}
                helperText="Select the area most applicable to your issue."
              />
            </div>

            {/* Description Textarea */}
            <div>
              <Textarea
                id={descriptionTextareaId}
                name="description"
                label="Description"
                required
                rows={5}
                value={description}
                maxLength={1000}
                showCount={true}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) {
                    setFieldErrors((prev) => ({ ...prev, description: "" }));
                  }
                }}
                disabled={submitting}
                placeholder="Describe what occurred, meal timing, and any relevant details..."
                error={fieldErrors.description}
                helperText="Provide specific details (5 to 1000 characters) to help the mess team investigate."
              />
            </div>

            {/* Optional Associated Rating */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
              <div className="space-y-0.5">
                <label className="block text-sm font-medium text-slate-900">
                  Associated Severity / Experience Rating{" "}
                  <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                </label>
                <p className="text-xs text-slate-500">
                  If this issue directly relates to food taste or preparation, you may attach a rating.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <StarRating
                  value={rating}
                  onChange={(val) => setRating(val)}
                  size="md"
                  disabled={submitting}
                />
                {rating > 0 && (
                  <button
                    type="button"
                    onClick={() => setRating(0)}
                    disabled={submitting}
                    className="text-xs text-slate-500 hover:text-slate-800 underline focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded px-1"
                  >
                    Clear rating
                  </button>
                )}
              </div>
              {fieldErrors.rating && (
                <p className="text-xs font-medium text-rose-600">{fieldErrors.rating}</p>
              )}
            </div>

            {/* Helpful Guidance Notice */}
            <div className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-100 flex items-start gap-3">
              <svg
                className="w-4 h-4 text-blue-600 mt-0.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="space-y-0.5 text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800">Helpful Guidance</p>
                <p>
                  Include specific meal dates, meal types (breakfast, lunch, dinner), and locations when relevant. Avoid submitting duplicate complaints for the same incident.
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Link href="/student/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="ghost"
                  type="button"
                  disabled={submitting}
                  className="w-full sm:w-auto text-slate-600"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? "Submitting..." : "Submit Complaint"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
