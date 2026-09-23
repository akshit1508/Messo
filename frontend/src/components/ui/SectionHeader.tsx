import React from "react";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 ${className}`}
    >
      <div>
        <h3 className="text-base font-semibold tracking-tight text-slate-900">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
