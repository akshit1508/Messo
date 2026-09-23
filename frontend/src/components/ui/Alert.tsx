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
    info: "border-blue-200 bg-blue-50/80 text-blue-900",
    success: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
    warning: "border-amber-200 bg-amber-50/80 text-amber-900",
    error: "border-rose-200 bg-rose-50/80 text-rose-900",
  };

  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 text-sm relative flex items-start justify-between ${variantStyles[effectiveVariant]} ${className}`}
    >
      <div className="flex-1 pr-2">
        {title && <h5 className="mb-1 font-semibold leading-tight">{title}</h5>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 text-current opacity-70 hover:opacity-100 transition-opacity"
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
