import React from "react";

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs transition-shadow ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`mb-4 flex flex-col gap-1 ${className}`}>{children}</div>;
}

export function CardTitle({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3
      className={`text-base sm:text-lg font-semibold tracking-tight text-slate-900 ${className}`}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={`text-xs sm:text-sm text-slate-500 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 ${className}`}
    >
      {children}
    </div>
  );
}
