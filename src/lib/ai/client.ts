/**
 * Central Ollama HTTP client — the ONLY module that performs fetch() to Ollama.
 * Reads OLLAMA_BASE_URL via loadAiRuntimeEnv() / resolveOllamaBaseUrl().
 *
 * Server-only (Node.js). API routes must import from here — never fetch Ollama directly.
 */

import {
  AI_CONFIG_DEFAULTS,
  OLLAMA_MODEL_FALLBACK_CHAIN,
} from "@/config/ai";
import {
  loadAiRuntimeEnv,
  validateOllamaBaseUrl,
  type AiRuntimeEnv,
} from "@/lib/ai/env";
import {
  AiDisabledError,
  AiModelNotAllowedError,
  AiOutputTooLargeError,
  AiProviderError,
  AiTimeoutError,
  LOCAL_AI_UNAVAILABLE_MESSAGE,
  type AiErrorCode,
} from "@/lib/ai/errors";
import type { AiMessage } from "@/lib/ai/types";

export type AiClientFailure = {
  ok: false;
  error: string;
  code: AiErrorCode | "AI_UNKNOWN";
  status: number;
};

export type AiClientSuccess<T> = { ok: true; data: T };

export type AiClientResult<T> = AiClientSuccess<T> | AiClientFailure;

export type OllamaGenerateOptions = {
  model: string;
  prompt: string;
  system?: string;
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

function getEnv(): AiRuntimeEnv {
  return loadAiRuntimeEnv();
}

function apiRoot(env: AiRuntimeEnv): string {
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

function networkClientMessage(): string {
  return LOCAL_AI_UNAVAILABLE_MESSAGE;
}

/** Map thrown AI errors to structured API-safe failures (never rethrow from routes). */
export function toAiClientFailure(err: unknown): AiClientFailure {
  if (err instanceof AiDisabledError) {
    return { ok: false, error: err.message, code: err.code, status: 503 };
  }
  if (err instanceof AiModelNotAllowedError) {
    return { ok: false, error: err.message, code: err.code, status: 400 };
  }
  if (err instanceof AiTimeoutError) {
    return { ok: false, error: err.message, code: err.code, status: 504 };
  }
  if (err instanceof AiOutputTooLargeError) {
    return { ok: false, error: err.message, code: err.code, status: 413 };
  }
  if (err instanceof AiProviderError) {
    console.error("[ai] provider error:", err.message, err.causeUnknown);
    return {
      ok: false,
      error: err.clientMessage ?? LOCAL_AI_UNAVAILABLE_MESSAGE,
      code: err.code,
      status: 502,
    };
  }
  console.error("[ai] unexpected error:", err);
  return {
    ok: false,
    error: "AI request failed.",
    code: "AI_UNKNOWN",
    status: 500,
  };
}

async function withInferenceLock<T>(fn: () => Promise<T>): Promise<T> {
  if (AI_CONFIG_DEFAULTS.maxConcurrentInferences <= 1) {
    const next = inferenceChain.then(fn, fn);
    inferenceChain = next.catch(() => undefined);
    return next;
  }
  return fn();
}

function messagesToPrompt(messages: AiMessage[]): { system?: string; prompt: string } {
  const systemParts: string[] = [];
  const userParts: string[] = [];
  for (const m of messages) {
    if (m.role === "system") systemParts.push(m.content);
    else if (m.role === "user") userParts.push(m.content);
    else if (m.role === "assistant") userParts.push(`Assistant: ${m.content}`);
  }
  return {
    system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    prompt: userParts.join("\n\n") || messages.at(-1)?.content || "",
  };
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

async function fetchTags(env: AiRuntimeEnv): Promise<string[]> {
  const now = Date.now();
  if (tagsCache && tagsCache.expiresAt > now) {
    return tagsCache.names;
  }

  const url = `${apiRoot(env)}/api/tags`;
  const timeout = new AbortController();
  const t = setTimeout(() => timeout.abort(), Math.min(env.timeoutMs, 15_000));
  try {
    const res = await fetch(url, { signal: timeout.signal, cache: "no-store" });
    if (!res.ok) {
      throw new AiProviderError(
        `Ollama tags HTTP ${res.status}`,
        await res.text(),
        networkClientMessage()
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
        networkClientMessage()
      );
    }
    throw new AiProviderError(
      e instanceof Error ? e.message : "Ollama tags request failed.",
      e,
      networkClientMessage()
    );
  } finally {
    clearTimeout(t);
  }
}

/** Single /api/generate wall-clock cap — keeps JSON responses ahead of CDN idle timeouts. */
function effectiveGenerateTimeoutMs(env: AiRuntimeEnv): number {
  if (env.proxySafeTimeoutMs <= 0) return env.timeoutMs;
  return Math.min(env.timeoutMs, env.proxySafeTimeoutMs);
}

async function invokeGenerate(
  env: AiRuntimeEnv,
  opts: OllamaGenerateOptions
): Promise<OllamaGenerateResult> {
  const url = `${apiRoot(env)}/api/generate`;
  const timeout = new AbortController();
  const onExternalAbort = () => timeout.abort();
  opts.signal?.addEventListener("abort", onExternalAbort, { once: true });

  const t = setTimeout(() => timeout.abort(), effectiveGenerateTimeoutMs(env));
  try {
    const body: Record<string, unknown> = {
      model: opts.model,
      prompt: opts.prompt,
      stream: false,
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
        networkClientMessage()
      );
    }

    const rawText = await res.text();
    if (!res.ok) {
      const detail = parseOllamaErrorBody(rawText);
      throw new AiProviderError(
        `Ollama generate HTTP ${res.status}: ${detail}`,
        rawText.slice(0, 1200),
        networkClientMessage()
      );
    }

    let parsed: OllamaGenerateResponse;
    try {
      parsed = JSON.parse(rawText) as OllamaGenerateResponse;
    } catch (e) {
      throw new AiProviderError(
        "Ollama returned invalid JSON.",
        e,
        networkClientMessage()
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

async function generateInternal(
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

/** Warm model registry on first AI call. */
export async function primeOllamaModelCache(): Promise<void> {
  await listInstalledModelNamesSafe();
}

/** GET /api/tags — installed model names (throws on failure; use safe variant in routes). */
export async function listInstalledModelNames(env?: AiRuntimeEnv): Promise<string[]> {
  return fetchTags(env ?? getEnv());
}

/** Safe variant for API routes — never throws. */
export async function listInstalledModelNamesSafe(
  env?: AiRuntimeEnv
): Promise<AiClientResult<string[]>> {
  try {
    const names = await fetchTags(env ?? getEnv());
    return { ok: true, data: names };
  } catch (e) {
    return toAiClientFailure(e);
  }
}

export async function resolveInstalledModel(
  preferred: string,
  env?: AiRuntimeEnv
): Promise<{ model: string; fallbackUsed: boolean }> {
  const runtime = env ?? getEnv();
  const chain = [
    preferred,
    ...OLLAMA_MODEL_FALLBACK_CHAIN.filter((m) => m !== preferred),
  ];
  let installed: string[] = [];
  try {
    installed = await fetchTags(runtime);
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

/**
 * POST /api/generate — primary completion entry. Returns structured result; never throws.
 */
export async function ollamaComplete(
  opts: OllamaGenerateOptions & { env?: AiRuntimeEnv }
): Promise<AiClientResult<OllamaGenerateResult>> {
  const env = opts.env ?? getEnv();
  try {
    await primeOllamaModelCache();
    const { model } = await resolveInstalledModel(opts.model, env);
    const data = await generateInternal(env, { ...opts, model });
    return { ok: true, data };
  } catch (e) {
    return toAiClientFailure(e);
  }
}

/** Complete from chat-style messages (system + user roles). Never throws. */
export async function ollamaCompleteMessages(input: {
  messages: AiMessage[];
  model: string;
  temperature?: number;
  numPredict?: number;
  env?: AiRuntimeEnv;
}): Promise<AiClientResult<OllamaGenerateResult>> {
  const { system, prompt } = messagesToPrompt(input.messages);
  const env = input.env ?? getEnv();
  return ollamaComplete({
    env,
    model: input.model,
    prompt,
    system,
    temperature: input.temperature,
    numPredict: input.numPredict ?? env.maxTokens,
  });
}

/** Health probe for GET /api/ai/health. Never throws. */
export async function checkOllamaHealth(
  env?: AiRuntimeEnv
): Promise<OllamaHealthStatus> {
  const runtime = env ?? getEnv();
  const base = {
    enabled: runtime.enabled,
    baseUrl: runtime.ollamaBaseUrl,
    model: runtime.defaultModel,
    resolvedModel: null as string | null,
    fallbackUsed: false,
    installedModels: [] as string[],
  };

  if (!runtime.enabled) {
    return {
      ...base,
      ok: false,
      reachable: false,
      modelInstalled: false,
      message: "AI features are disabled (AI_ENABLED=false).",
    };
  }

  const tagsResult = await listInstalledModelNamesSafe(runtime);
  if (!tagsResult.ok) {
    return {
      ...base,
      ok: false,
      reachable: false,
      modelInstalled: false,
      message: tagsResult.error,
    };
  }

  const installed = tagsResult.data;
  const { model, fallbackUsed } = await resolveInstalledModel(
    runtime.defaultModel,
    runtime
  );
  const modelInstalled = installed.includes(runtime.defaultModel);

  return {
    ...base,
    ok: installed.length > 0,
    reachable: true,
    modelInstalled,
    resolvedModel: model,
    fallbackUsed,
    installedModels: installed,
    message: modelInstalled
      ? `Ollama is reachable; ${runtime.defaultModel} is installed.`
      : fallbackUsed
        ? `Ollama is reachable; ${runtime.defaultModel} missing — would use ${model}.`
        : installed.length === 0
          ? "Ollama is reachable but no models are installed."
          : `Ollama is reachable; ${runtime.defaultModel} is not installed.`,
  };
}
