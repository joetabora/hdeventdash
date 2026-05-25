import { loadEnvConfig } from "@next/env";
import {
  AI_CONFIG_DEFAULTS,
  DEFAULT_OLLAMA_MODEL,
} from "@/config/ai";
import {
  AiDisabledError,
  AiModelNotAllowedError,
  AiProviderError,
} from "@/lib/ai/errors";

export type AiRuntimeEnv = {
  enabled: boolean;
  ollamaBaseUrl: string;
  defaultModel: string;
  allowedModels: string[];
  timeoutMs: number;
  /** Extra Ollama fetch attempts beyond the first (transient/network errors only). */
  ollamaRetryExtraAttempts: number;
  maxPromptChars: number;
  maxCompletionChars: number;
  /** Ollama `num_predict` cap per request. */
  maxTokens: number;
  defaultTemperature: number;
  streamingEnabled: boolean;
  /** When non-empty, `OLLAMA_BASE_URL` hostname must match one entry. */
  hostAllowlist: string[];
};

let aiDotfilesPrimed = false;

function primeAiDotenv(): void {
  if (aiDotfilesPrimed) return;
  aiDotfilesPrimed = true;
  try {
    loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", undefined, true);
  } catch {
    /* Non-fatal */
  }
}

function env(key: string): string | undefined {
  primeAiDotenv();
  return Reflect.get(process.env, key) as string | undefined;
}

function parseBool(v: string | undefined): boolean {
  if (v == null) return false;
  let t = v.trim().toLowerCase();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim().toLowerCase();
  }
  return t === "true" || t === "1" || t === "yes" || t === "on";
}

function parseCsvModels(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCsvHosts(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function loadAiRuntimeEnv(): AiRuntimeEnv {
  const enabled = parseBool(env("AI_ENABLED"));
  const ollamaBaseUrl = (env("OLLAMA_BASE_URL") ?? AI_CONFIG_DEFAULTS.baseUrl).trim();
  const defaultModel = (env("OLLAMA_DEFAULT_MODEL") ?? DEFAULT_OLLAMA_MODEL).trim();
  const allowedModels = parseCsvModels(env("OLLAMA_ALLOWED_MODELS"));
  const timeoutMsParsed = Number(env("AI_REQUEST_TIMEOUT_MS"));
  const timeoutMsRaw =
    Number.isFinite(timeoutMsParsed) && timeoutMsParsed > 0
      ? timeoutMsParsed
      : AI_CONFIG_DEFAULTS.timeoutMs;
  const timeoutMs = Math.max(AI_CONFIG_DEFAULTS.timeoutMs, timeoutMsRaw);
  const retriesParsed = Number(env("AI_OLLAMA_RETRIES") ?? AI_CONFIG_DEFAULTS.retries);
  const retryExtraRaw = Number.isFinite(retriesParsed)
    ? Math.floor(retriesParsed)
    : AI_CONFIG_DEFAULTS.retries;
  const ollamaRetryExtraAttempts = Math.min(5, Math.max(0, retryExtraRaw));
  const maxPromptRaw = Number(env("AI_MAX_PROMPT_CHARS") ?? AI_CONFIG_DEFAULTS.maxPromptChars);
  const maxPromptChars =
    Number.isFinite(maxPromptRaw) && maxPromptRaw >= 1000
      ? maxPromptRaw
      : AI_CONFIG_DEFAULTS.maxPromptChars;
  const maxCompletionRaw = Number(
    env("AI_MAX_COMPLETION_CHARS") ?? AI_CONFIG_DEFAULTS.maxCompletionChars
  );
  const maxCompletionChars =
    Number.isFinite(maxCompletionRaw) && maxCompletionRaw >= 500
      ? maxCompletionRaw
      : AI_CONFIG_DEFAULTS.maxCompletionChars;
  const maxTokensRaw = Number(env("AI_MAX_TOKENS") ?? AI_CONFIG_DEFAULTS.maxTokens);
  const maxTokens =
    Number.isFinite(maxTokensRaw) && maxTokensRaw >= 256
      ? Math.floor(maxTokensRaw)
      : AI_CONFIG_DEFAULTS.maxTokens;
  const temperatureRaw = Number(env("AI_DEFAULT_TEMPERATURE") ?? AI_CONFIG_DEFAULTS.temperature);
  const defaultTemperature =
    Number.isFinite(temperatureRaw) && temperatureRaw >= 0 && temperatureRaw <= 2
      ? temperatureRaw
      : AI_CONFIG_DEFAULTS.temperature;
  const streamingEnabled = parseBool(env("AI_STREAMING_ENABLED"))
    ? true
    : AI_CONFIG_DEFAULTS.streamingEnabled;
  const hostAllowlist = parseCsvHosts(env("OLLAMA_HOST_ALLOWLIST"));

  return {
    enabled,
    ollamaBaseUrl,
    defaultModel,
    allowedModels,
    timeoutMs,
    ollamaRetryExtraAttempts,
    maxPromptChars,
    maxCompletionChars,
    maxTokens,
    defaultTemperature,
    streamingEnabled,
    hostAllowlist,
  };
}

export function assertAiEnabled(envSnapshot: AiRuntimeEnv): void {
  if (!envSnapshot.enabled) {
    const raw = env("AI_ENABLED");
    const hint =
      raw == null || raw.trim() === ""
        ? "Add AI_ENABLED=true to .env.local (or deployment env). Restart after changing env files."
        : `AI_ENABLED is set to "${raw.trim()}" — use true, 1, yes, or on.`;
    throw new AiDisabledError(`AI features are disabled. ${hint}`);
  }
  if (!envSnapshot.ollamaBaseUrl) {
    throw new AiDisabledError(
      "AI is enabled but OLLAMA_BASE_URL is not configured."
    );
  }
}

export function validateOllamaBaseUrl(
  rawUrl: string,
  hostAllowlist: string[]
): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AiProviderError(
      "OLLAMA_BASE_URL is not a valid URL.",
      undefined,
      "OLLAMA_BASE_URL is not a valid URL."
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AiProviderError(
      "OLLAMA_BASE_URL must use http or https.",
      undefined,
      "OLLAMA_BASE_URL must use http or https."
    );
  }
  if (url.username || url.password) {
    throw new AiProviderError(
      "OLLAMA_BASE_URL must not embed credentials.",
      undefined,
      "OLLAMA_BASE_URL must not embed credentials."
    );
  }
  if (hostAllowlist.length > 0 && !hostAllowlist.includes(url.hostname)) {
    throw new AiProviderError(
      `OLLAMA_BASE_URL hostname "${url.hostname}" is not in OLLAMA_HOST_ALLOWLIST.`,
      undefined,
      `OLLAMA_HOST_ALLOWLIST does not include "${url.hostname}". Add this host, or remove OLLAMA_HOST_ALLOWLIST if you intentionally use LAN IPs like 192.168.x.x.`
    );
  }
  return url;
}

export function resolveModelId(
  env: AiRuntimeEnv,
  requested?: string | null
): string {
  const def = env.defaultModel;
  const resolved = requested?.trim() || def;
  if (!resolved) {
    throw new AiModelNotAllowedError("Model is required.");
  }
  if (env.allowedModels.length > 0) {
    if (!env.allowedModels.includes(resolved)) {
      throw new AiModelNotAllowedError();
    }
    return resolved;
  }
  if (resolved !== def) {
    throw new AiModelNotAllowedError(
      "Only the default model is allowed. Set OLLAMA_ALLOWED_MODELS to permit others."
    );
  }
  return resolved;
}
