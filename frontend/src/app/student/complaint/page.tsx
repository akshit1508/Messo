"use client";

import React, { useState } from "react";
import Link from "next/link";
import { studentApi } from "@/lib/student";
import { ApiError } from "@/types/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!complaintType.trim()) {
      errors.type = "Complaint type is required";
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
        response.message || "Your complaint has been submitted. Mess administration will review it."
      );
      // Clear form on success
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
        setGeneralError(err.message || "Failed to submit complaint. Please check the inputs.");
      } else {
        setGeneralError("An unexpected error occurred while submitting your grievance.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="File a Grievance or Suggestion"
        description="Submit concerns regarding food quality, dining hygiene, or facility issues directly to the mess administration."
      />

      {successMessage && (
        <Alert
          variant="success"
          title="Grievance Registered"
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      {generalError && (
        <Alert
          variant="danger"
          title="Submission Error"
          onClose={() => setGeneralError(null)}
        >
          {generalError}
        </Alert>
      )}

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Complaint Details
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category */}
            <div>
              <label
                htmlFor="complaintType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Complaint Category <span className="text-red-500">*</span>
              </label>
              <select
                id="complaintType"
                name="complaintType"
                value={complaintType}
                onChange={(e) => setComplaintType(e.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                {COMPLAINT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {fieldErrors.type && (
                <p className="mt-1.5 text-xs text-red-600">{fieldErrors.type}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-400">
                  {description.length} / 1000 characters
                </span>
              </div>
              <textarea
                id="description"
                name="description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                placeholder="Describe what occurred, date/meal timing, and any relevant details..."
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-1 disabled:opacity-50 ${
                  fieldErrors.description
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
              />
              {fieldErrors.description && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">
                  {fieldErrors.description}
                </p>
              )}
            </div>

            {/* Optional Food / Severity Rating */}
            <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Associated Severity / Meal Experience Rating{" "}
                <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                If your complaint relates directly to meal preparation quality, you may specify a rating.
              </p>
              <div className="flex items-center space-x-3">
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
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Clear rating
                  </button>
                )}
              </div>
              {fieldErrors.rating && (
                <p className="mt-1.5 text-xs text-red-600">{fieldErrors.rating}</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
              <Link href="/student/dashboard">
                <Button variant="ghost" type="button" disabled={submitting}>
                  Cancel
                </Button>
              </Link>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Submitting grievance..." : "Submit Complaint"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
