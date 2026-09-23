import { CsrfResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Extracts a cookie value by name from document.cookie
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Retrieves the current CSRF token:
 * 1. Checks if XSRF-TOKEN cookie is already present in document.cookie
 * 2. If not, fetches a fresh token from GET /api/auth/csrf
 */
export async function getCsrfToken(): Promise<string> {
  const existingCookieToken = getCookie("XSRF-TOKEN");
  if (existingCookieToken) {
    return existingCookieToken;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data: CsrfResponse = await res.json();
      return data.token;
    }
  } catch (error) {
    console.error("Failed to fetch CSRF token from backend:", error);
  }

  // Fallback to checking cookie once more if set during request
  return getCookie("XSRF-TOKEN") || "";
}
