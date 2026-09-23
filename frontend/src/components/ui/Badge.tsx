import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "neutral" | "info";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  className = "",
}: BadgeProps) {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs font-medium",
    md: "px-2.5 py-1 text-xs font-semibold",
  };

  const variantStyles = {
    default: "bg-blue-50 text-blue-700 border border-blue-200/80",
    info: "bg-sky-50 text-sky-700 border border-sky-200/80",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
    warning: "bg-amber-50 text-amber-800 border border-amber-200/80",
    danger: "bg-rose-50 text-rose-700 border border-rose-200/80",
    neutral: "bg-slate-100 text-slate-700 border border-slate-200",
  };

  const dotColorMap = {
    default: "bg-blue-500",
    info: "bg-sky-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    neutral: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${dotColorMap[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
