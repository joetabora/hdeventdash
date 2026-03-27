"use client";

import { useCallback, useState } from "react";
import { formSubmitErrorMessage } from "@/lib/form-submit-error";

/**
 * Consistent pending + error state for async form submit handlers.
 * Validation errors should use `setError` before returning (do not call `run`).
 */
export function useFormSubmitState() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const clearError = useCallback(() => setError(""), []);

  const run = useCallback(
    async <T,>(task: () => Promise<T>): Promise<T | undefined> => {
      setPending(true);
      setError("");
      try {
        return await task();
      } catch (e) {
        setError(formSubmitErrorMessage(e));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    []
  );

  return { pending, error, setError, clearError, run };
}
