"use client";

import React, { useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin";
import { formatErrorMessage } from "@/lib/error";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function CreatePollPage() {
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleAddOption = () => {
    if (options.length >= 8) {
      setErrorMessage("Maximum 8 options allowed per poll.");
      return;
    }
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      setErrorMessage("A menu poll must have at least 2 candidate options.");
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const trimmedOptions = options.map((opt) => opt.trim());
    const emptyCount = trimmedOptions.filter((opt) => opt.length === 0).length;

    if (emptyCount > 0) {
      setErrorMessage("All option fields must have a valid food name.");
      return;
    }

    if (trimmedOptions.length < 2) {
      setErrorMessage("At least two food options are required.");
      return;
    }

    // Check for duplicates
    const uniqueOptions = new Set(trimmedOptions.map((o) => o.toLowerCase()));
    if (uniqueOptions.size !== trimmedOptions.length) {
      setErrorMessage("Food options must be distinct. Duplicate food names were detected.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await adminApi.createPoll({ foods: trimmedOptions });
      setSuccessMessage(
        response.message || "Menu poll created successfully. Students can now cast votes!"
      );
      // Reset form
      setOptions(["", ""]);
    } catch (err) {
      setErrorMessage(formatErrorMessage(err, "Failed to create menu poll"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Create Menu Poll"
        description="Configure candidate food choices for students to vote on for tomorrow's dining schedule."
        action={
          <Link href="/admin/poll-results">
            <Button variant="outline" size="sm">
              View Active Poll &rarr;
            </Button>
          </Link>
        }
      />

      {successMessage && (
        <Alert
          variant="success"
          title="Poll Published"
          onClose={() => setSuccessMessage(null)}
        >
          <div className="space-y-2">
            <p>{successMessage}</p>
            <div className="pt-1">
              <Link href="/admin/poll-results" className="font-semibold underline">
                Go to Poll Results &rarr;
              </Link>
            </div>
          </div>
        </Alert>
      )}

      {errorMessage && (
        <Alert
          variant="danger"
          title="Validation Warning"
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      <Card className="border border-gray-200 shadow-xs">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900">
            Candidate Food Items
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-xs text-gray-500">
              Provide at least 2 distinct meal options. Students will see these choices on their voting portal.
            </p>

            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="w-6 text-xs font-semibold text-gray-400 text-center">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    required
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`e.g. ${index === 0 ? "Paneer Butter Masala" : index === 1 ? "Chole Bhature" : "Dal Makhani"}`}
                    disabled={submitting}
                    className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove option"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                disabled={submitting || options.length >= 8}
                className="text-xs"
              >
                + Add Another Food Option
              </Button>
            </div>

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
                {submitting ? "Publishing Poll..." : "Create & Launch Poll"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
