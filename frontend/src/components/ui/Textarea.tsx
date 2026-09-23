"use client";

import React, { forwardRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      id,
      className = "",
      required,
      maxLength,
      showCount,
      value,
      ...props
    },
    ref
  ) => {
    const textareaId = id || props.name;
    const currentLength = typeof value === "string" ? value.length : 0;

    return (
      <div className="w-full">
        {label && (
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor={textareaId}
              className="block text-sm font-medium text-slate-700"
            >
              {label}
              {required && <span className="text-rose-500 ml-1">*</span>}
            </label>
            {showCount && maxLength && (
              <span className="text-xs text-slate-400">
                {currentLength} / {maxLength}
              </span>
            )}
          </div>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          required={required}
          maxLength={maxLength}
          value={value}
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 bg-white shadow-xs transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
            ${
              error
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/20"
            } ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
