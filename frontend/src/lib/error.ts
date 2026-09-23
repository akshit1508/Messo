import { ApiError } from "@/types/api";

export function formatErrorMessage(
  error: unknown,
  fallback: string = "An unexpected error occurred. Please try again."
): string {
  if (error instanceof ApiError) {
    if (error.details && error.details.length > 0) {
      return error.details.join(", ");
    }
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
