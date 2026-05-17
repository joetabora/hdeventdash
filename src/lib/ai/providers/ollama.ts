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

export class OllamaProvider implements AiProvider {
  private readonly chatUrl: string;

  constructor(private readonly env: AiRuntimeEnv) {
    const base = validateOllamaBaseUrl(
      env.ollamaBaseUrl,
      env.hostAllowlist
    );
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

      const res = await fetch(this.chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: req.model,
          messages: req.messages,
          stream: false,
        }),
        signal: merged.signal,
      });

      const rawText = await res.text();
      if (!res.ok) {
        throw new AiProviderError(
          `Ollama returned HTTP ${res.status}.`,
          rawText.slice(0, 500)
        );
      }

      let parsed: OllamaChatResponse;
      try {
        parsed = JSON.parse(rawText) as OllamaChatResponse;
      } catch (e) {
        throw new AiProviderError("Ollama returned invalid JSON.", e);
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
      if (e instanceof AiProviderError || e instanceof AiOutputTooLargeError) {
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
        e
      );
    } finally {
      clearTimeout(t);
    }
  }
}
