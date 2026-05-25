/**
 * Static AI defaults. Runtime URL always comes from OLLAMA_BASE_URL
 * (fallback: http://127.0.0.1:11434 — see resolveOllamaBaseUrl in env.ts).
 */

/** Default model tag when OLLAMA_DEFAULT_MODEL is unset. */
export const DEFAULT_OLLAMA_MODEL = "qwen3:8b";

/** Model tags tried when the preferred model is not installed (same host only). */
export const OLLAMA_MODEL_FALLBACK_CHAIN = [
  "qwen3:8b",
  "qwen2.5:7b",
  "llama3.1:8b",
] as const;

export const AI_CONFIG_DEFAULTS = {
  /** Safe local fallback when OLLAMA_BASE_URL is missing or empty. */
  baseUrl: "http://127.0.0.1:11434",
  defaultModel: DEFAULT_OLLAMA_MODEL,
  timeoutMs: 90_000,
  retries: 1,
  temperature: 0.7,
  maxTokens: 2048,
  streamingEnabled: false,
  maxPromptChars: 48_000,
  maxCompletionChars: 24_000,
  modelTagsCacheTtlMs: 60_000,
  maxConcurrentInferences: 1,
} as const;
