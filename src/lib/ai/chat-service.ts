import type { AiMessage } from "@/lib/ai/types";
import {
  assertAiEnabled,
  loadAiRuntimeEnv,
  resolveModelId,
  type AiRuntimeEnv,
} from "@/lib/ai/env";
import {
  ollamaCompleteMessages,
  toAiClientFailure,
  type AiClientFailure,
  type AiClientResult,
} from "@/lib/ai/client";
import { AiProviderError } from "@/lib/ai/errors";

const DEFAULT_SYSTEM_POLICY = [
  "You are a helpful marketing assistant for a Harley-Davidson dealership event team.",
  "Be concise, accurate, and on-brand (community, riding culture, professionalism).",
  "Do not invent specific legal claims, discounts, or guarantees unless provided in context.",
  "Do not include private or sensitive data beyond what the user supplied in the prompt context.",
].join("\n");

/**
 * Prepended when `policyMode === "marketing"` (playbook marketing + copy-pack templates).
 * Ollama receives this as part of `system`; template rules (`input.system`) follow.
 */
const MARKETING_SYSTEM_POLICY = [
  "You are a fast professional marketing copywriter.",
  "Generate polished final copy immediately.",
  "Do not explain your reasoning.",
  "Do not think aloud.",
  "Output only the final result.",
  "",
  "Context: Harley-Davidson dealership event marketing. Honor length, structure, tone, and platform rules in the following instructions.",
  "Write publish-ready, emotionally engaging copy with concrete sensory detail when the briefing supports it.",
  "Do not invent sponsors, discounts, legal claims, or perks unless stated in the briefing.",
  "Do not include private or sensitive data beyond what the briefing supplies.",
].join("\n");

export type AiChatServiceCompleteInput = {
  system?: string;
  user: string;
  model?: string | null;
  temperature?: number | null;
  numPredict?: number | null;
  /** Use marketing policy instead of concise default policy (playbook marketing templates). */
  policyMode?: "default" | "marketing";
  /** Optional Ollama sampling (marketing generations). */
  topP?: number | null;
  repeatPenalty?: number | null;
};

export type AiChatServiceCompleteResult = {
  text: string;
  model: string;
};

export type AiChatServiceCompleteOutcome =
  | { ok: true; data: AiChatServiceCompleteResult }
  | AiClientFailure;

function getEnv(): AiRuntimeEnv {
  return loadAiRuntimeEnv();
}

function countPromptChars(messages: AiMessage[]): number {
  return messages.reduce((n, m) => n + m.content.length, 0);
}

/**
 * Server-only entry: validates env, resolves model, enforces size limits, calls Ollama client.
 * Never throws for Ollama/network failures — returns structured failure instead.
 */
export async function aiCompleteTextSafe(
  input: AiChatServiceCompleteInput
): Promise<AiChatServiceCompleteOutcome> {
  const env = getEnv();
  try {
    assertAiEnabled(env);
  } catch (e) {
    return toAiClientFailure(e);
  }

  let model: string;
  try {
    model = resolveModelId(env, input.model);
  } catch (e) {
    return toAiClientFailure(e);
  }

  const basePolicy =
    input.policyMode === "marketing" ? MARKETING_SYSTEM_POLICY : DEFAULT_SYSTEM_POLICY;
  const system = [basePolicy, input.system].filter(Boolean).join("\n\n");
  const messages: AiMessage[] = [
    { role: "system", content: system },
    { role: "user", content: input.user },
  ];

  const promptChars = countPromptChars(messages);
  if (promptChars > env.maxPromptChars) {
    return {
      ok: false,
      error: `Prompt is too large (${env.maxPromptChars} characters max). Shorten playbook fields and try again.`,
      code: "AI_PROVIDER_ERROR",
      status: 502,
    };
  }

  const result: AiClientResult<{ text: string; model: string; done: boolean }> =
    await ollamaCompleteMessages({
      env,
      messages,
      model,
      ...(input.temperature != null ? { temperature: input.temperature } : {}),
      ...(input.numPredict != null ? { numPredict: input.numPredict } : {}),
      ...(input.topP != null ? { topP: input.topP } : {}),
      ...(input.repeatPenalty != null ? { repeatPenalty: input.repeatPenalty } : {}),
    });

  if (!result.ok) return result;
  return { ok: true, data: { text: result.data.text, model: result.data.model } };
}

/** @deprecated Prefer aiCompleteTextSafe in route handlers. Throws on failure. */
export async function aiCompleteText(
  input: AiChatServiceCompleteInput
): Promise<AiChatServiceCompleteResult> {
  const outcome = await aiCompleteTextSafe(input);
  if (!outcome.ok) {
    throw new AiProviderError(outcome.error, undefined, outcome.error);
  }
  return outcome.data;
}

export function listAllowedModelIds(): string[] {
  const env = getEnv();
  if (!env.enabled) return [];
  if (env.allowedModels.length > 0) return [...env.allowedModels];
  return [env.defaultModel];
}
