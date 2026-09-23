import React from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  action,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`mb-6 pb-4 border-b border-slate-200/90 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
