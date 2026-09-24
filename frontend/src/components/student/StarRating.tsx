"use client";

import React, { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StarRating({
  value,
  onChange,
  disabled = false,
  size = "md",
  className = "",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  };

  const activeRating = hoverValue !== null ? hoverValue : value;

  return (
    <div
      className={`inline-flex items-center space-x-1 ${className}`}
      role="group"
      aria-label="Star Rating"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= activeRating;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled || !onChange}
            onClick={() => onChange && onChange(star)}
            onMouseEnter={() => !disabled && onChange && setHoverValue(star)}
            onMouseLeave={() => !disabled && onChange && setHoverValue(null)}
            className={`transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded p-1 ${
              disabled || !onChange
                ? "cursor-default"
                : "cursor-pointer hover:scale-110 active:scale-95"
            }`}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            aria-pressed={star <= value}
          >
            <svg
              className={`${sizeClasses[size]} ${
                isFilled
                  ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                  : "text-slate-300 fill-slate-100"
              } transition-colors`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={isFilled ? "0" : "1.5"}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
