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

type AiCompletionPath = "/api/ai/complete" | `/api/events/${string}/ai/complete`;

function wasAbortError(e: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      e instanceof DOMException &&
      e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

/**
 * POST to `/api/ai/complete` or `/api/events/:eventId/ai/complete` with loading/error/retry/cancel.
 * Inference runs on the server against local Ollama (`/api/generate`).
 */
export function useAiCompletion() {
  const [status, setStatus] = useState<AiCompletionStatus>("idle");
  const [data, setData] = useState<AiCompleteApiResponse | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<{ path: AiCompletionPath; body: AiCompletionRunBody } | null>(
    null
  );

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
      path: AiCompletionPath,
      body: AiCompletionRunBody
    ): Promise<AiCompleteApiResponse | undefined> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      lastRequestRef.current = { path, body };
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

  const retry = useCallback(async () => {
    const last = lastRequestRef.current;
    if (!last) return undefined;
    return run(last.path, last.body);
  }, [run]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { status, data, error, run, retry, abort, reset };
}
