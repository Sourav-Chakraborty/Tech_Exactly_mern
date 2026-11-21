import { useCallback, useState } from "react";
import type { ParsedApiError } from "../utils/apiError";

/**
 * Holds the API error of a form. `clearField(name)` removes that field's message as soon as the
 * user edits the field; once no field messages remain, the summary ("Validation failed") is
 * dropped too. Errors without field details (e.g. "Invalid email or password") stay until the
 * next submit.
 */
export function useFormError() {
  const [error, setError] = useState<ParsedApiError | null>(null);

  const clearField = useCallback((field: string) => {
    setError((prev) => {
      if (!prev?.fieldErrors[field]) return prev;
      const fieldErrors = { ...prev.fieldErrors };
      delete fieldErrors[field];
      return Object.keys(fieldErrors).length > 0 ? { ...prev, fieldErrors } : null;
    });
  }, []);

  return { error, setError, clearField };
}
