"use client";

import { Loader2, RefreshCw, Square, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiCompletionStatus } from "@/hooks/use-ai-completion";

type AiGenerationStatusProps = {
  status: AiCompletionStatus;
  error?: string;
  loadingMessage?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
};

/**
 * Shared AI UX: loading indicator, offline message, retry, and cancel.
 */
export function AiGenerationStatus({
  status,
  error,
  loadingMessage = "Generating with local Ollama (qwen3:8b)…",
  onRetry,
  onCancel,
  className = "",
}: AiGenerationStatusProps) {
  if (status === "idle" && !error) return null;

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {status === "loading" ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-2 text-[11px] text-harley-text-muted leading-relaxed">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-harley-orange" aria-hidden />
            {loadingMessage}
          </p>
          {onCancel ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={onCancel}
            >
              <Square className="h-3 w-3" aria-hidden />
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}

      {status === "error" && error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2.5 space-y-2">
          <p className="flex items-start gap-2 text-xs text-red-300 leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            {error}
          </p>
          {onRetry ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={onRetry}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
