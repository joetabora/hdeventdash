/**
 * Central AI / Ollama configuration.
 * Values are read from environment at call time (never inlined at build).
 *
 * Switch models: set OLLAMA_DEFAULT_MODEL (e.g. qwen3:8b) and optionally
 * OLLAMA_ALLOWED_MODELS for a comma-separated allowlist.
 */

/** Default model tag when env is unset. Optimized for RTX 2060 6GB class hardware. */
export const DEFAULT_OLLAMA_MODEL = "qwen3:8b";

/** Ordered fallbacks when the preferred model is not installed locally. */
export const OLLAMA_MODEL_FALLBACK_CHAIN = [
  "qwen3:8b",
  "qwen2.5:7b",
  "llama3.1:8b",
] as const;

export const AI_CONFIG_DEFAULTS = {
  /** Ollama base URL (no trailing slash). */
  baseUrl: "http://localhost:11434",
  defaultModel: DEFAULT_OLLAMA_MODEL,
  /** Server-side fetch deadline per inference request. */
  timeoutMs: 90_000,
  /** Extra attempts after the first failure (1 = retry once). */
  retries: 1,
  /** Default sampling temperature when a template does not override. */
  temperature: 0.7,
  /** Ollama `num_predict` — caps completion length for low-VRAM GPUs. */
  maxTokens: 2048,
  /** Server routes use non-streaming `/api/generate` by default. */
  streamingEnabled: false,
  maxPromptChars: 48_000,
  maxCompletionChars: 24_000,
  /** How long cached `/api/tags` results remain valid. */
  modelTagsCacheTtlMs: 60_000,
  /** Only one Ollama inference at a time (protects FX-class CPUs + 6GB VRAM). */
  maxConcurrentInferences: 1,
} as const;

export type AiConfigSnapshot = {
  enabled: boolean;
  baseUrl: string;
  defaultModel: string;
  fallbackModels: readonly string[];
  timeoutMs: number;
  retries: number;
  temperature: number;
  maxTokens: number;
  streamingEnabled: boolean;
  maxPromptChars: number;
  maxCompletionChars: number;
};
