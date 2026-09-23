import React from "react";
import { Card, CardContent } from "@/components/ui/Card";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: "default" | "warning" | "success" | "danger";
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
}: KpiCardProps) {
  const iconColorMap = {
    default: "bg-blue-50 text-blue-600",
    warning: "bg-amber-50 text-amber-600",
    success: "bg-emerald-50 text-emerald-600",
    danger: "bg-rose-50 text-rose-600",
  };

  return (
    <Card className="border border-gray-200 shadow-xs hover:border-gray-300 transition-colors">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            {value}
          </p>
          {subtitle && <p className="text-xs text-gray-400 font-medium">{subtitle}</p>}
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconColorMap[variant]}`}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
