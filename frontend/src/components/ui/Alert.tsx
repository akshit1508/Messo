import React from "react";

export interface AlertProps {
  variant?: "info" | "success" | "warning" | "error" | "danger";
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  onClose,
  className = "",
}: AlertProps) {
  const effectiveVariant = variant === "danger" ? "error" : variant;

  const variantStyles = {
    info: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
    warning:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
    error:
      "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
  };

  return (
    <div
      role="alert"
      className={`rounded-lg border p-4 text-sm relative flex items-start justify-between ${variantStyles[effectiveVariant]} ${className}`}
    >
      <div className="flex-1 pr-2">
        {title && <h5 className="mb-1 font-semibold leading-tight">{title}</h5>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-current opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss alert"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
