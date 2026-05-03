import axios, { type AxiosError } from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("note_share_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Error helpers ────────────────────────────────────────────────────────────

export type ApiFieldErrors = Record<string, string[] | undefined>;

export type ApiErrorResult =
  | { type: "network"; message: string }
  | { type: "field"; errors: ApiFieldErrors }
  | { type: "message"; message: string };

/**
 * Extracts a structured error from an Axios error so callers can handle
 * network failures, field validation errors, and plain message errors
 * without repeating the same conditional chain everywhere.
 */
export function parseApiError(err: unknown): ApiErrorResult {
  const axiosErr = err as AxiosError<{
    message?: string;
    errors?: ApiFieldErrors;
  }>;

  // No response at all → connection refused / timeout / DNS failure
  if (!axiosErr.response) {
    console.error(
      "[API] Network error:",
      axiosErr.message,
      `(${API_BASE_URL})`,
    );
    return {
      type: "network",
      message: `Cannot reach the server at ${API_BASE_URL}. Make sure the backend is running.`,
    };
  }

  const body = axiosErr.response.data;

  // Server returned field-level validation errors
  if (body?.errors && Object.keys(body.errors).length > 0) {
    return { type: "field", errors: body.errors };
  }

  // Server returned a plain message (e.g. "Invalid credentials")
  return {
    type: "message",
    message: body?.message ?? `Unexpected error (${axiosErr.response.status})`,
  };
}
