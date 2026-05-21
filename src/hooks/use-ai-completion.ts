"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetchJson } from "@/lib/api/api-fetch-json";
import type { AiCompleteApiResponse } from "@/lib/ai/api-contract";
import { formSubmitErrorMessage } from "@/lib/form-submit-error";

export type AiCompletionStatus = "idle" | "loading" | "success" | "error";

export type AiCompletionRunBody = {
  templateId: string;
  variables?: Record<string, unknown>;
  model?: string;
  temperature?: number;
};

function wasAbortError(e: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      e instanceof DOMException &&
      e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

/**
 * POST to `/api/ai/complete` or `/api/events/:eventId/ai/complete` with loading/error state.
 * The hook's `AbortController` only cancels the browser→API `fetch`; the route runs inference
 * with `AI_REQUEST_TIMEOUT_MS` and does not mirror Cloudflare/proxy inbound disconnects.
 */
export function useAiCompletion() {
  const [status, setStatus] = useState<AiCompletionStatus>("idle");
  const [data, setData] = useState<AiCompleteApiResponse | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setData(null);
    setError("");
  }, []);

  const run = useCallback(
    async (
      path: "/api/ai/complete" | `/api/events/${string}/ai/complete`,
      body: AiCompletionRunBody
    ): Promise<AiCompleteApiResponse | undefined> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setStatus("loading");
      setError("");
      setData(null);
      try {
        const payload: Record<string, unknown> = {
          templateId: body.templateId,
          variables: body.variables ?? {},
        };
        if (body.model?.trim()) payload.model = body.model.trim();
        if (body.temperature != null) payload.temperature = body.temperature;

        const res = await apiFetchJson<AiCompleteApiResponse>(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: ac.signal,
        });
        setData(res);
        setStatus("success");
        return res;
      } catch (e) {
        if (wasAbortError(e)) {
          setStatus("idle");
          return undefined;
        }
        setError(formSubmitErrorMessage(e));
        setStatus("error");
        return undefined;
      }
    },
    []
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return { status, data, error, run, abort, reset };
}
