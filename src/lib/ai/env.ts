import { loadEnvConfig } from "@next/env";
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
  maxPromptChars: number;
  maxCompletionChars: number;
  /** When non-empty, `OLLAMA_BASE_URL` hostname must match one entry. */
  hostAllowlist: string[];
};

let aiDotfilesPrimed = false;

/**
 * Ensures `.env*` files are merged into `process.env` for this Node process.
 * Needed because route bundles may otherwise miss `.env.local`, and because static
 * `process.env.FOO` reads can be inlined at build time as `undefined`.
 */
function primeAiDotenv(): void {
  if (aiDotfilesPrimed) return;
  aiDotfilesPrimed = true;
  try {
    loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", undefined, true);
  } catch {
    /* Non-fatal: fall through to whatever is already on process.env */
  }
}

/** Resolve env without static `process.env.KEY` access (avoids Next build-time inlining). */
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
  const ollamaBaseUrl = (env("OLLAMA_BASE_URL") ?? "").trim();
  const defaultModel = (env("OLLAMA_DEFAULT_MODEL") ?? "llama3.2").trim();
  const allowedModels = parseCsvModels(env("OLLAMA_ALLOWED_MODELS"));
  const timeoutMsRaw = Number(env("AI_REQUEST_TIMEOUT_MS") ?? 120_000);
  const timeoutMs =
    Number.isFinite(timeoutMsRaw) && timeoutMsRaw >= 3000 ? timeoutMsRaw : 120_000;
  const maxPromptRaw = Number(env("AI_MAX_PROMPT_CHARS") ?? 48_000);
  const maxPromptChars =
    Number.isFinite(maxPromptRaw) && maxPromptRaw >= 1000 ? maxPromptRaw : 48_000;
  const maxCompletionRaw = Number(env("AI_MAX_COMPLETION_CHARS") ?? 24_000);
  const maxCompletionChars =
    Number.isFinite(maxCompletionRaw) && maxCompletionRaw >= 500
      ? maxCompletionRaw
      : 24_000;
  const hostAllowlist = parseCsvHosts(env("OLLAMA_HOST_ALLOWLIST"));

  return {
    enabled,
    ollamaBaseUrl,
    defaultModel,
    allowedModels,
    timeoutMs,
    maxPromptChars,
    maxCompletionChars,
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
    throw new AiProviderError("OLLAMA_BASE_URL is not a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AiProviderError("OLLAMA_BASE_URL must use http or https.");
  }
  if (url.username || url.password) {
    throw new AiProviderError("OLLAMA_BASE_URL must not embed credentials.");
  }
  if (hostAllowlist.length > 0 && !hostAllowlist.includes(url.hostname)) {
    throw new AiProviderError(
      `OLLAMA_BASE_URL hostname "${url.hostname}" is not in OLLAMA_HOST_ALLOWLIST.`
    );
  }
  return url;
}

export function resolveModelId(
  env: AiRuntimeEnv,
  requested?: string | null
): string {
  const def = env.defaultModel;
  const resolved = (requested?.trim() || def);
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
