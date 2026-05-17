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

function parseBool(v: string | undefined): boolean {
  return v === "true" || v === "1";
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
  const enabled = parseBool(process.env.AI_ENABLED);
  const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL ?? "").trim();
  const defaultModel = (process.env.OLLAMA_DEFAULT_MODEL ?? "llama3.2").trim();
  const allowedModels = parseCsvModels(process.env.OLLAMA_ALLOWED_MODELS);
  const timeoutMsRaw = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 120_000);
  const timeoutMs =
    Number.isFinite(timeoutMsRaw) && timeoutMsRaw >= 3000 ? timeoutMsRaw : 120_000;
  const maxPromptRaw = Number(process.env.AI_MAX_PROMPT_CHARS ?? 48_000);
  const maxPromptChars =
    Number.isFinite(maxPromptRaw) && maxPromptRaw >= 1000 ? maxPromptRaw : 48_000;
  const maxCompletionRaw = Number(process.env.AI_MAX_COMPLETION_CHARS ?? 24_000);
  const maxCompletionChars =
    Number.isFinite(maxCompletionRaw) && maxCompletionRaw >= 500
      ? maxCompletionRaw
      : 24_000;
  const hostAllowlist = parseCsvHosts(process.env.OLLAMA_HOST_ALLOWLIST);

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

export function assertAiEnabled(env: AiRuntimeEnv): void {
  if (!env.enabled) {
    throw new AiDisabledError();
  }
  if (!env.ollamaBaseUrl) {
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
