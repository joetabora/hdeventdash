import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
  AiMessage,
} from "@/lib/ai/types";
import type { AiRuntimeEnv } from "@/lib/ai/env";
import {
  ollamaGenerate,
  primeOllamaModelCache,
  resolveInstalledModel,
} from "@/lib/ai/ollama-client";

/** Converts chat-style messages to Ollama `/api/generate` prompt + system fields. */
function messagesToGeneratePayload(messages: AiMessage[]): {
  system?: string;
  prompt: string;
} {
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

/**
 * Server-side Ollama provider — direct `/api/generate` (no Open WebUI / OpenAI shim).
 */
export class OllamaProvider implements AiProvider {
  constructor(private readonly env: AiRuntimeEnv) {}

  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    await primeOllamaModelCache(this.env);
    const { model } = await resolveInstalledModel(this.env, req.model);
    const { system, prompt } = messagesToGeneratePayload(req.messages);

    const out = await ollamaGenerate(this.env, {
      model,
      prompt,
      system,
      stream: false,
      temperature: req.temperature,
      numPredict: this.env.maxTokens,
    });

    return {
      text: out.text,
      model: out.model,
      finishReason: out.done ? "stop" : undefined,
    };
  }
}
