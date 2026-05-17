import type { AiMessage, AiProvider } from "@/lib/ai/types";
import {
  assertAiEnabled,
  loadAiRuntimeEnv,
  resolveModelId,
  type AiRuntimeEnv,
} from "@/lib/ai/env";
import { OllamaProvider } from "@/lib/ai/providers/ollama";
import { AiProviderError } from "@/lib/ai/errors";

const DEFAULT_SYSTEM_POLICY = [
  "You are a helpful marketing assistant for a Harley-Davidson dealership event team.",
  "Be concise, accurate, and on-brand (community, riding culture, professionalism).",
  "Do not invent specific legal claims, discounts, or guarantees unless provided in context.",
  "Do not include private or sensitive data beyond what the user supplied in the prompt context.",
].join(" ");

export type AiChatServiceCompleteInput = {
  system?: string;
  user: string;
  model?: string | null;
  signal?: AbortSignal;
};

export type AiChatServiceCompleteResult = {
  text: string;
  model: string;
};

let cachedEnv: AiRuntimeEnv | null = null;
let cachedProvider: AiProvider | null = null;

function getEnv(): AiRuntimeEnv {
  cachedEnv ??= loadAiRuntimeEnv();
  return cachedEnv;
}

function getProvider(env: AiRuntimeEnv): AiProvider {
  cachedProvider ??= new OllamaProvider(env);
  return cachedProvider;
}

function countPromptChars(messages: AiMessage[]): number {
  return messages.reduce((n, m) => n + m.content.length, 0);
}

/**
 * Server-only entry: validates env, resolves model, enforces size limits, calls Ollama.
 */
export async function aiCompleteText(
  input: AiChatServiceCompleteInput
): Promise<AiChatServiceCompleteResult> {
  const env = getEnv();
  assertAiEnabled(env);

  const model = resolveModelId(env, input.model);
  const system = [DEFAULT_SYSTEM_POLICY, input.system].filter(Boolean).join("\n\n");
  const messages: AiMessage[] = [
    { role: "system", content: system },
    { role: "user", content: input.user },
  ];

  const promptChars = countPromptChars(messages);
  if (promptChars > env.maxPromptChars) {
    throw new AiProviderError(
      `Prompt exceeds maximum size (${env.maxPromptChars} characters).`
    );
  }

  const provider = getProvider(env);
  const out = await provider.complete({
    messages,
    model,
    signal: input.signal,
  });
  return { text: out.text, model: out.model };
}

export function listAllowedModelIds(): string[] {
  const env = getEnv();
  if (!env.enabled) return [];
  if (env.allowedModels.length > 0) return [...env.allowedModels];
  return [env.defaultModel];
}
