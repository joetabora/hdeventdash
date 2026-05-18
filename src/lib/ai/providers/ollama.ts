import type { AiCompletionRequest, AiCompletionResult, AiProvider } from "@/lib/ai/types";
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

function nestedErrorCode(err: unknown, depth = 0): string | undefined {
  if (depth > 8 || err == null || typeof err !== "object") return undefined;
  const o = err as { code?: string; cause?: unknown };
  if (typeof o.code === "string" && o.code.length > 0) return o.code;
  return nestedErrorCode(o.cause, depth + 1);
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

export class OllamaProvider implements AiProvider {
  private readonly chatUrl: string;

  constructor(private readonly env: AiRuntimeEnv) {
    const base = validateOllamaBaseUrl(env.ollamaBaseUrl, env.hostAllowlist);
    const root = `${base.origin}${base.pathname}`.replace(/\/+$/, "");
    this.chatUrl = `${root}/api/chat`;
  }

  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    const timeout = new AbortController();
    const t = setTimeout(() => timeout.abort(), this.env.timeoutMs);
    const merged = new AbortController();
    try {
      if (req.signal) {
        if (req.signal.aborted) {
          throw new AiTimeoutError();
        }
        req.signal.addEventListener(
          "abort",
          () => {
            merged.abort();
          },
          { once: true }
        );
      }
      timeout.signal.addEventListener(
        "abort",
        () => {
          merged.abort();
        },
        { once: true }
      );

      let res: Response;
      try {
        res = await fetch(this.chatUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: req.model,
            messages: req.messages,
            stream: false,
          }),
          signal: merged.signal,
        });
      } catch (e) {
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
        model: parsed.model ?? req.model,
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
      if (e instanceof DOMException && e.name === "AbortError") {
        throw new AiTimeoutError();
      }
      if (e instanceof Error && e.name === "AbortError") {
        throw new AiTimeoutError();
      }
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
