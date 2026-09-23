"use client";

import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = "", required, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          required={required}
          className={`w-full rounded-lg border px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 bg-white shadow-xs transition-colors
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

Input.displayName = "Input";
