import { isAxiosError } from "axios";
import type { ApiErrorBody } from "../types";

export interface ParsedApiError {
  message: string;
  // HTTP status, when the server responded (e.g. 404 -> show a "not found" page)
  status?: number;
  // Validation messages keyed by field name, e.g. { email: "Invalid email address" }
  fieldErrors: Record<string, string>;
}

// Turns any thrown value into a message (+ per-field errors) to show in the UI.
export const parseApiError = (err: unknown): ParsedApiError => {
  if (isAxiosError<ApiErrorBody>(err)) {
    const body = err.response?.data;
    const status = err.response?.status;
    if (body?.message) {
      const fieldErrors: Record<string, string> = {};
      for (const d of body.details ?? []) {
        if (d.field && !fieldErrors[d.field]) fieldErrors[d.field] = d.message;
      }
      return { message: body.message, status, fieldErrors };
    }
    if (!err.response) {
      return { message: "Cannot reach the server. Is the API running?", fieldErrors: {} };
    }
    return { message: "Something went wrong. Please try again.", status, fieldErrors: {} };
  }
  return { message: "Something went wrong. Please try again.", fieldErrors: {} };
};
