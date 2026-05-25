/**
 * Direct Ollama REST client — no Open WebUI, OpenAI SDK, or proxy layer.
 * Uses `/api/generate` (non-streaming) and `/api/tags` (model discovery).
 */

import {
  AI_CONFIG_DEFAULTS,
  OLLAMA_MODEL_FALLBACK_CHAIN,
} from "@/config/ai";
import type { AiRuntimeEnv } from "@/lib/ai/env";
import { validateOllamaBaseUrl } from "@/lib/ai/env";
import {
  AiOutputTooLargeError,
  AiProviderError,
  AiTimeoutError,
  LOCAL_AI_UNAVAILABLE_MESSAGE,
} from "@/lib/ai/errors";

export type OllamaGenerateOptions = {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  temperature?: number;
  numPredict?: number;
  signal?: AbortSignal;
};

export type OllamaGenerateResult = {
  text: string;
  model: string;
  done: boolean;
};

export type OllamaHealthStatus = {
  ok: boolean;
  enabled: boolean;
  reachable: boolean;
  modelInstalled: boolean;
  model: string;
  resolvedModel: string | null;
  fallbackUsed: boolean;
  installedModels: string[];
  baseUrl: string;
  message: string;
};

type OllamaTagsResponse = {
  models?: { name?: string; model?: string }[];
};

type OllamaGenerateResponse = {
  model?: string;
  response?: string;
  done?: boolean;
  error?: string;
};

const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);
const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "EPIPE",
  "ECONNREFUSED",
  "ENOTFOUND",
  "UND_ERR_SOCKET",
]);

let tagsCache: { names: string[]; expiresAt: number } | null = null;
let inferenceChain: Promise<unknown> = Promise.resolve();

function ollamaRoot(env: AiRuntimeEnv): string {
  const base = validateOllamaBaseUrl(env.ollamaBaseUrl, env.hostAllowlist);
  return `${base.origin}${base.pathname}`.replace(/\/+$/, "");
}

function nestedCode(err: unknown, depth = 0): string | undefined {
  if (depth > 8 || err == null || typeof err !== "object") return undefined;
  const o = err as { code?: string; cause?: unknown };
  if (typeof o.code === "string" && o.code.length > 0) return o.code;
  return nestedCode(o.cause, depth + 1);
}

function isAbort(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  const c = nestedCode(err);
  return c === "ABORT_ERR" || c === "UND_ERR_ABORTED";
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => void setTimeout(r, ms));
}

function parseOllamaErrorBody(raw: string): string {
  try {
    const j = JSON.parse(raw) as { error?: string };
    const m = typeof j.error === "string" ? j.error.trim() : "";
    if (m) return m.slice(0, 500);
  } catch {
    /* non-JSON */
  }
  return raw.slice(0, 320).trim();
}

function networkClientMessage(err: unknown): string {
  const code = nestedCode(err);
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return LOCAL_AI_UNAVAILABLE_MESSAGE;
  }
  const msg = err instanceof Error ? err.message : "";
  if (/fetch failed/i.test(msg)) return LOCAL_AI_UNAVAILABLE_MESSAGE;
  return LOCAL_AI_UNAVAILABLE_MESSAGE;
}

/** Serialize inference so parallel UI actions do not overload local GPU/CPU. */
async function withInferenceLock<T>(fn: () => Promise<T>): Promise<T> {
  if (AI_CONFIG_DEFAULTS.maxConcurrentInferences <= 1) {
    const next = inferenceChain.then(fn, fn);
    inferenceChain = next.catch(() => undefined);
    return next;
  }
  return fn();
}

/** Warm model registry on first AI call (queries GET /api/tags). */
export async function primeOllamaModelCache(env: AiRuntimeEnv): Promise<void> {
  await listInstalledModelNames(env);
}

/** GET /api/tags — installed model names (cached briefly). */
export async function listInstalledModelNames(
  env: AiRuntimeEnv
): Promise<string[]> {
  const now = Date.now();
  if (tagsCache && tagsCache.expiresAt > now) {
    return tagsCache.names;
  }

  const url = `${ollamaRoot(env)}/api/tags`;
  const timeout = new AbortController();
  const t = setTimeout(() => timeout.abort(), Math.min(env.timeoutMs, 15_000));
  try {
    const res = await fetch(url, { signal: timeout.signal, cache: "no-store" });
    if (!res.ok) {
      throw new AiProviderError(
        `Ollama tags HTTP ${res.status}`,
        await res.text(),
        LOCAL_AI_UNAVAILABLE_MESSAGE
      );
    }
    const data = (await res.json()) as OllamaTagsResponse;
    const names = (data.models ?? [])
      .map((m) => (m.name ?? m.model ?? "").trim())
      .filter(Boolean);
    tagsCache = {
      names,
      expiresAt: now + AI_CONFIG_DEFAULTS.modelTagsCacheTtlMs,
    };
    return names;
  } catch (e) {
    if (isAbort(e)) {
      throw new AiProviderError(
        "Timed out listing Ollama models.",
        e,
        LOCAL_AI_UNAVAILABLE_MESSAGE
      );
    }
    throw new AiProviderError(
      e instanceof Error ? e.message : "Ollama tags request failed.",
      e,
      networkClientMessage(e)
    );
  } finally {
    clearTimeout(t);
  }
}

/** Pick the first installed model from preferred + fallback chain. */
export async function resolveInstalledModel(
  env: AiRuntimeEnv,
  preferred: string
): Promise<{ model: string; fallbackUsed: boolean }> {
  const chain = [
    preferred,
    ...OLLAMA_MODEL_FALLBACK_CHAIN.filter((m) => m !== preferred),
  ];
  let installed: string[] = [];
  try {
    installed = await listInstalledModelNames(env);
  } catch {
    return { model: preferred, fallbackUsed: false };
  }
  if (installed.length === 0) {
    return { model: preferred, fallbackUsed: false };
  }
  for (const candidate of chain) {
    if (installed.includes(candidate)) {
      return { model: candidate, fallbackUsed: candidate !== preferred };
    }
  }
  return { model: installed[0]!, fallbackUsed: installed[0] !== preferred };
}

function shouldRetry(err: unknown): boolean {
  if (err instanceof AiTimeoutError || err instanceof AiOutputTooLargeError) {
    return false;
  }
  if (!(err instanceof AiProviderError)) return false;
  if (isAbort(err.causeUnknown)) return false;
  const m = /^Ollama generate HTTP (\d+)/.exec(err.message);
  if (m) {
    const status = Number(m[1]);
    return TRANSIENT_HTTP.has(status) || status >= 500;
  }
  const c = nestedCode(err.causeUnknown);
  return Boolean(c && TRANSIENT_CODES.has(c));
}

/** POST /api/generate — non-streaming completion. */
export async function ollamaGenerate(
  env: AiRuntimeEnv,
  opts: OllamaGenerateOptions
): Promise<OllamaGenerateResult> {
  const maxAttempts = 1 + env.ollamaRetryExtraAttempts;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await withInferenceLock(() => invokeGenerate(env, opts));
    } catch (e) {
      lastErr = e;
      if (attempt + 1 < maxAttempts && shouldRetry(e)) {
        await delay(500 * Math.pow(2, attempt));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function invokeGenerate(
  env: AiRuntimeEnv,
  opts: OllamaGenerateOptions
): Promise<OllamaGenerateResult> {
  const url = `${ollamaRoot(env)}/api/generate`;
  const timeout = new AbortController();
  const onExternalAbort = () => timeout.abort();
  opts.signal?.addEventListener("abort", onExternalAbort, { once: true });

  const t = setTimeout(() => timeout.abort(), env.timeoutMs);
  try {
    const body: Record<string, unknown> = {
      model: opts.model,
      prompt: opts.prompt,
      stream: opts.stream ?? false,
    };
    if (opts.system?.trim()) body.system = opts.system.trim();
    const options: Record<string, number> = {
      num_predict: opts.numPredict ?? env.maxTokens,
    };
    if (opts.temperature != null) options.temperature = opts.temperature;
    body.options = options;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: timeout.signal,
        cache: "no-store",
      });
    } catch (e) {
      if (isAbort(e)) throw new AiTimeoutError();
      throw new AiProviderError(
        e instanceof Error ? e.message : "Ollama generate failed.",
        e,
        networkClientMessage(e)
      );
    }

    const rawText = await res.text();
    if (!res.ok) {
      const detail = parseOllamaErrorBody(rawText);
      throw new AiProviderError(
        `Ollama generate HTTP ${res.status}: ${detail}`,
        rawText.slice(0, 1200),
        LOCAL_AI_UNAVAILABLE_MESSAGE
      );
    }

    let parsed: OllamaGenerateResponse;
    try {
      parsed = JSON.parse(rawText) as OllamaGenerateResponse;
    } catch (e) {
      throw new AiProviderError(
        "Ollama returned invalid JSON.",
        e,
        LOCAL_AI_UNAVAILABLE_MESSAGE
      );
    }

    const text = parsed.response ?? "";
    if (text.length > env.maxCompletionChars) {
      throw new AiOutputTooLargeError();
    }

    return {
      text,
      model: parsed.model ?? opts.model,
      done: parsed.done ?? true,
    };
  } finally {
    clearTimeout(t);
    opts.signal?.removeEventListener("abort", onExternalAbort);
  }
}

/**
 * POST /api/generate with stream:true — yields incremental text chunks.
 * Caller must consume the full iterator to release the inference lock.
 */
export async function* ollamaGenerateStream(
  env: AiRuntimeEnv,
  opts: Omit<OllamaGenerateOptions, "stream">
): AsyncGenerator<string, OllamaGenerateResult, undefined> {
  const url = `${ollamaRoot(env)}/api/generate`;
  const timeout = new AbortController();
  const t = setTimeout(() => timeout.abort(), env.timeoutMs);

  let releaseLock!: () => void;
  const lock = new Promise<void>((r) => {
    releaseLock = r;
  });
  inferenceChain = inferenceChain.then(() => lock);

  try {
    const body: Record<string, unknown> = {
      model: opts.model,
      prompt: opts.prompt,
      stream: true,
    };
    if (opts.system?.trim()) body.system = opts.system.trim();
    const options: Record<string, number> = {
      num_predict: opts.numPredict ?? env.maxTokens,
    };
    if (opts.temperature != null) options.temperature = opts.temperature;
    body.options = options;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: timeout.signal,
      cache: "no-store",
    });

    if (!res.ok || !res.body) {
      const detail = parseOllamaErrorBody(await res.text());
      throw new AiProviderError(
        `Ollama stream HTTP ${res.status}: ${detail}`,
        undefined,
        LOCAL_AI_UNAVAILABLE_MESSAGE
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    let finalModel = opts.model;
    let done = false;

    while (true) {
      const { value, done: readDone } = await reader.read();
      if (readDone) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const chunk = JSON.parse(trimmed) as OllamaGenerateResponse;
          if (chunk.model) finalModel = chunk.model;
          if (chunk.response) {
            full += chunk.response;
            yield chunk.response;
          }
          if (chunk.done) done = true;
        } catch {
          /* skip malformed NDJSON line */
        }
      }
    }

    if (full.length > env.maxCompletionChars) {
      throw new AiOutputTooLargeError();
    }

    return { text: full, model: finalModel, done };
  } catch (e) {
    if (isAbort(e)) throw new AiTimeoutError();
    if (e instanceof AiProviderError || e instanceof AiOutputTooLargeError) {
      throw e;
    }
    throw new AiProviderError(
      e instanceof Error ? e.message : "Ollama stream failed.",
      e,
      networkClientMessage(e)
    );
  } finally {
    clearTimeout(t);
    releaseLock();
  }
}

/** Health probe for GET /api/ai/health. */
export async function checkOllamaHealth(
  env: AiRuntimeEnv
): Promise<OllamaHealthStatus> {
  const base = {
    enabled: env.enabled,
    baseUrl: env.ollamaBaseUrl,
    model: env.defaultModel,
    resolvedModel: null as string | null,
    fallbackUsed: false,
    installedModels: [] as string[],
  };

  if (!env.enabled) {
    return {
      ...base,
      ok: false,
      reachable: false,
      modelInstalled: false,
      message: "AI features are disabled (AI_ENABLED=false).",
    };
  }

  if (!env.ollamaBaseUrl) {
    return {
      ...base,
      ok: false,
      reachable: false,
      modelInstalled: false,
      message: "OLLAMA_BASE_URL is not configured.",
    };
  }

  try {
    const installed = await listInstalledModelNames(env);
    const { model, fallbackUsed } = await resolveInstalledModel(
      env,
      env.defaultModel
    );
    const modelInstalled = installed.includes(env.defaultModel);
    const reachable = true;
    return {
      ...base,
      ok: reachable && installed.length > 0,
      reachable,
      modelInstalled,
      resolvedModel: model,
      fallbackUsed,
      installedModels: installed,
      message: modelInstalled
        ? `Ollama is reachable; ${env.defaultModel} is installed.`
        : fallbackUsed
          ? `Ollama is reachable; ${env.defaultModel} missing — would use ${model}.`
          : installed.length === 0
            ? "Ollama is reachable but no models are installed."
            : `Ollama is reachable; ${env.defaultModel} is not installed.`,
    };
  } catch (e) {
    const msg =
      e instanceof AiProviderError && e.clientMessage
        ? e.clientMessage
        : LOCAL_AI_UNAVAILABLE_MESSAGE;
    return {
      ...base,
      ok: false,
      reachable: false,
      modelInstalled: false,
      message: msg,
    };
  }
}
