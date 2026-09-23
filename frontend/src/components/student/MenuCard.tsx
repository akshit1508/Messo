import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface MenuCardProps {
  title: string;
  date?: string;
  foodName?: string | null;
  mealType?: string | null;
  isAvailable: boolean;
  statusBadgeText: string;
  statusBadgeVariant?: "default" | "success" | "warning" | "danger" | "neutral";
  actionHref?: string;
  actionText?: string;
  emptyMessage: string;
}

export function MenuCard({
  title,
  date,
  foodName,
  mealType,
  isAvailable,
  statusBadgeText,
  statusBadgeVariant = "default",
  actionHref,
  actionText,
  emptyMessage,
}: MenuCardProps) {
  return (
    <Card className="flex flex-col justify-between h-full border border-gray-200 hover:border-gray-300 transition-colors shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold text-gray-900">{title}</CardTitle>
            {date && <p className="text-xs text-gray-500 font-medium">{date}</p>}
          </div>
          <Badge variant={statusBadgeVariant}>{statusBadgeText}</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
        {isAvailable && foodName ? (
          <div>
            {mealType && (
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded mb-2">
                {mealType}
              </span>
            )}
            <h4 className="text-xl font-bold text-gray-900 leading-snug">{foodName}</h4>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-gray-500 italic">{emptyMessage}</p>
          </div>
        )}

        {actionHref && actionText && (
          <div className="pt-2">
            <Link href={actionHref} className="w-full block">
              <Button variant="outline" size="sm" className="w-full justify-center">
                {actionText} &rarr;
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
