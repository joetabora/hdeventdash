import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
  AiMessage,
} from "@/lib/ai/types";
import {
  AiOutputTooLargeError,
  AiProviderError,
  AiTimeoutError,
} from "@/lib/ai/errors";
import type { AiRuntimeEnv } from "@/lib/ai/env";
import { validateOllamaBaseUrl } from "@/lib/ai/env";

type OllamaChatResponse = {
  message?: { role?: string; content?: string };
  model?: string;
  done?: boolean;
};

const TRANSIENT_OLLAMA_HTTP = new Set([
  408, 425, 429, 500, 502, 503, 504,
]);

/** Syscall / undici markers we see on flaky tunnels or restarting Ollama. */
const TRANSIENT_SYSCALL_CODES = new Set([
  "ECONNRESET",
  "EPIPE",
  "ECONNREFUSED",
  "ENOTFOUND",
  "UND_ERR_SOCKET",
]);

function nestedErrorCode(err: unknown, depth = 0): string | undefined {
  if (depth > 8 || err == null || typeof err !== "object") return undefined;
  const o = err as { code?: string; cause?: unknown };
  if (typeof o.code === "string" && o.code.length > 0) return o.code;
  return nestedErrorCode(o.cause, depth + 1);
}

function delayMs(ms: number): Promise<void> {
  return new Promise((r) => void setTimeout(r, ms));
}

/** True when aborted by our AbortController timeout (never treat as generic provider failure). */
function isLikelyAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  const c = nestedErrorCode(err);
  return c === "ABORT_ERR" || c === "UND_ERR_ABORTED";
}

function ollamaErrorDetailFromBody(rawText: string): string {
  const slice = rawText.slice(0, 800).trim();
  try {
    const j = JSON.parse(rawText) as { error?: string };
    const m = typeof j.error === "string" ? j.error.trim() : "";
    if (m) return m.slice(0, 500);
  } catch {
    /* non-JSON */
  }
  return slice.slice(0, 320);
}

const CONN_HINT =
  "If Next runs in Docker, 127.0.0.1 points at the container, not your Mac — try http://host.docker.internal:11434 (Docker Desktop), your host LAN IP, or the Compose service name for Ollama.";

function clientMessageForNetworkFailure(err: unknown): string {
  const code = nestedErrorCode(err);
  if (code === "ECONNREFUSED") {
    return `Cannot connect to Ollama (connection refused). ${CONN_HINT}`;
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return "Cannot resolve Ollama host from OLLAMA_BASE_URL — check spelling and DNS.";
  }
  if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
    return "Timed out contacting Ollama — check firewall or that port 11434 is reachable.";
  }
  if (code === "CERT_HAS_EXPIRED" || code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
    return "TLS error contacting Ollama — use plain http locally or fix HTTPS certificates.";
  }
  const msg = err instanceof Error ? err.message : "";
  if (/fetch failed/i.test(msg)) {
    return `Network error contacting Ollama. ${CONN_HINT}`;
  }
  return `Could not reach Ollama (${msg || "unknown error"}). ${CONN_HINT}`;
}

function httpStatusFromOllamaProviderMessage(message: string): number | undefined {
  const m = /^Ollama returned HTTP (\d+)/.exec(message);
  return m ? Number(m[1]) : undefined;
}

function shouldRetryOllamaFailure(err: unknown): boolean {
  if (err instanceof AiTimeoutError || err instanceof AiOutputTooLargeError) {
    return false;
  }
  if (!(err instanceof AiProviderError)) return false;
  if (isLikelyAbortError(err.causeUnknown)) return false;

  const status = httpStatusFromOllamaProviderMessage(err.message);
  if (status != null) {
    if (TRANSIENT_OLLAMA_HTTP.has(status) || status >= 500) return true;
    return false;
  }

  const sc = nestedErrorCode(err.causeUnknown);
  return Boolean(sc && TRANSIENT_SYSCALL_CODES.has(sc));
}

export class OllamaProvider implements AiProvider {
  private readonly chatUrl: string;

  constructor(private readonly env: AiRuntimeEnv) {
    const base = validateOllamaBaseUrl(env.ollamaBaseUrl, env.hostAllowlist);
    const root = `${base.origin}${base.pathname}`.replace(/\/+$/, "");
    this.chatUrl = `${root}/api/chat`;
  }

  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    const maxAttempts = 1 + this.env.ollamaRetryExtraAttempts;
    let lastErr: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.invokeChat(req.messages, req.model);
      } catch (e) {
        lastErr = e;
        const retry =
          attempt + 1 < maxAttempts && shouldRetryOllamaFailure(e);
        if (!retry) throw e;
        await delayMs(550 * Math.pow(2, attempt));
      }
    }
    throw lastErr;
  }

  /** Single `/api/chat` round-trip bounded only by configured server timeout (`AI_REQUEST_TIMEOUT_MS`). */
  private async invokeChat(
    messages: AiMessage[],
    model: string
  ): Promise<AiCompletionResult> {
    const timeout = new AbortController();
    const t = setTimeout(() => timeout.abort(), this.env.timeoutMs);
    try {
      let res: Response;
      try {
        res = await fetch(this.chatUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages,
            stream: false,
          }),
          signal: timeout.signal,
        });
      } catch (e) {
        if (isLikelyAbortError(e)) throw new AiTimeoutError();
        throw new AiProviderError(
          e instanceof Error ? e.message : "Ollama request failed.",
          e,
          clientMessageForNetworkFailure(e)
        );
      }

      const rawText = await res.text();

      if (!res.ok) {
        const detail = ollamaErrorDetailFromBody(rawText);
        throw new AiProviderError(
          `Ollama returned HTTP ${res.status}: ${detail}`,
          rawText.slice(0, 1200),
          `Ollama error (${res.status}): ${detail}`
        );
      }

      let parsed: OllamaChatResponse;
      try {
        parsed = JSON.parse(rawText) as OllamaChatResponse;
      } catch (e) {
        throw new AiProviderError(
          "Ollama returned invalid JSON.",
          e,
          "Ollama returned unreadable JSON — verify OLLAMA_BASE_URL points at Ollama, not another service."
        );
      }

      const content = parsed.message?.content ?? "";
      if (content.length > this.env.maxCompletionChars) {
        throw new AiOutputTooLargeError();
      }

      return {
        text: content,
        model: parsed.model ?? model,
        finishReason: parsed.done ? "stop" : undefined,
      };
    } catch (e) {
      if (
        e instanceof AiProviderError ||
        e instanceof AiOutputTooLargeError ||
        e instanceof AiTimeoutError
      ) {
        throw e;
      }
      if (isLikelyAbortError(e)) throw new AiTimeoutError();
      throw new AiProviderError(
        e instanceof Error ? e.message : "Ollama request failed.",
        e,
        clientMessageForNetworkFailure(e)
      );
    } finally {
      clearTimeout(t);
    }
  }
}
