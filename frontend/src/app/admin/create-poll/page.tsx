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
    // Clear error on edit
    if (errorMessage) setErrorMessage(null);
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
      setOptions(["", ""]);
    } catch (err) {
      setErrorMessage(formatErrorMessage(err, "Failed to create menu poll"));
    } finally {
      setSubmitting(false);
    }
  };

  const filledCount = options.filter((o) => o.trim().length > 0).length;
  const isReady = filledCount >= 2 && options.every((o) => o.trim().length > 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Create Menu Poll"
        description="Configure candidate food choices for students to vote on for tomorrow's dining schedule."
        action={
          <Link href="/admin/poll-results">
            <Button variant="outline" size="sm">
              View Active Poll →
            </Button>
          </Link>
        }
      />

      {successMessage && (
        <Alert
          variant="success"
          title="Poll Published Successfully"
          onClose={() => setSuccessMessage(null)}
        >
          <div className="space-y-2">
            <p>{successMessage}</p>
            <div className="pt-1">
              <Link href="/admin/poll-results" className="font-semibold underline">
                Go to Poll Results →
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

      <Card>
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Candidate Food Items
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Provide at least 2 distinct meal options. Students will see these choices on their voting portal.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md shrink-0 ml-4">
              {options.length} / 8
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Option inputs */}
            <div className="space-y-3">
              {options.map((option, index) => {
                const isDuplicate =
                  option.trim().length > 0 &&
                  options.some(
                    (other, i) =>
                      i !== index &&
                      other.trim().toLowerCase() === option.trim().toLowerCase()
                  );

                return (
                  <div key={index} className="flex items-center gap-2.5">
                    <span className="w-6 text-xs font-bold text-slate-400 text-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        required
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={
                          index === 0
                            ? "e.g. Paneer Butter Masala"
                            : index === 1
                            ? "e.g. Chole Bhature"
                            : "e.g. Dal Makhani"
                        }
                        disabled={submitting}
                        aria-label={`Food option ${index + 1}`}
                        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-400 ${
                          isDuplicate
                            ? "border-rose-400 bg-rose-50/50"
                            : option.trim().length > 0
                            ? "border-emerald-400 bg-emerald-50/30"
                            : "border-slate-300 bg-white hover:border-slate-400"
                        }`}
                      />
                      {isDuplicate && (
                        <p className="text-xs text-rose-600 mt-1">Duplicate name detected</p>
                      )}
                    </div>
                    {options.length > 2 && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRemoveOption(index)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50 shrink-0"
                        title={`Remove option ${index + 1}`}
                        aria-label={`Remove food option ${index + 1}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add option button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleAddOption}
                disabled={submitting || options.length >= 8}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors py-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Another Food Option
              </button>
            </div>

            {/* Form hint */}
            {!isReady && options.some((o) => o.trim().length === 0) && (
              <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-200">
                Fill in all option fields before submitting. Minimum 2 options required.
              </p>
            )}

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
                disabled={submitting || !isReady}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Publishing Poll…
                  </span>
                ) : (
                  "Create & Launch Poll"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Helper panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-blue-900 mb-1.5 flex items-center gap-1.5">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How polls work
        </p>
        <ul className="space-y-1 text-blue-800 text-xs list-disc list-inside">
          <li>Only one active poll can exist at a time — the backend enforces this.</li>
          <li>Each student can vote once. Duplicate votes are rejected server-side.</li>
          <li>Go to <strong>Poll Results</strong> to view live tallies and publish the winner to tomorrow&rsquo;s menu.</li>
        </ul>
      </div>
    </div>
  );
}
