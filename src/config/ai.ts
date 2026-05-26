/**
 * Static AI defaults. Runtime URL always comes from OLLAMA_BASE_URL
 * (fallback: http://127.0.0.1:11434 — see resolveOllamaBaseUrl in env.ts).
 */

/** Default model tag when OLLAMA_DEFAULT_MODEL is unset. */
export const DEFAULT_OLLAMA_MODEL = "qwen2.5:7b-instruct";

/** Model tags tried when the preferred model is not installed (same host only). */
export const OLLAMA_MODEL_FALLBACK_CHAIN = [
  "qwen2.5:7b-instruct",
  "qwen2.5:7b",
  "qwen3:8b",
  "llama3.1:8b",
] as const;

export const AI_CONFIG_DEFAULTS = {
  /** Safe local fallback when OLLAMA_BASE_URL is missing or empty. */
  baseUrl: "http://127.0.0.1:11434",
  defaultModel: DEFAULT_OLLAMA_MODEL,
  timeoutMs: 90_000,
  /**
   * Cap per-generate wall time so the app returns JSON before common CDN/tunnel
   * idle timeouts (~90s). Set AI_PROXY_SAFE_TIMEOUT_MS=0 to disable the cap.
   */
  proxySafeTimeoutMs: 75_000,
  retries: 1,
  temperature: 0.7,
  /** Default Ollama num_predict — marketing templates often override lower. */
  maxTokens: 1024,
  streamingEnabled: false,
  maxPromptChars: 48_000,
  maxCompletionChars: 24_000,
  modelTagsCacheTtlMs: 60_000,
  maxConcurrentInferences: 1,
} as const;
