export type AiMessageRole = "system" | "user" | "assistant";

export type AiMessage = {
  role: AiMessageRole;
  content: string;
};

export type AiCompletionRequest = {
  messages: AiMessage[];
  model: string;
};

export type AiCompletionResult = {
  text: string;
  model: string;
  finishReason?: string;
};

export type AiProvider = {
  complete(req: AiCompletionRequest): Promise<AiCompletionResult>;
};
