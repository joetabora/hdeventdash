export class AiDisabledError extends Error {
  readonly code = "AI_DISABLED" as const;
  constructor(message = "AI features are disabled.") {
    super(message);
    this.name = "AiDisabledError";
  }
}

export class AiModelNotAllowedError extends Error {
  readonly code = "AI_MODEL_NOT_ALLOWED" as const;
  constructor(message = "That model is not allowed.") {
    super(message);
    this.name = "AiModelNotAllowedError";
  }
}

export class AiProviderError extends Error {
  readonly code = "AI_PROVIDER_ERROR" as const;
  readonly causeUnknown?: unknown;
  /** Safe to expose in API JSON (`502` responses); omit for generic wording. */
  readonly clientMessage?: string;
  constructor(message: string, causeUnknown?: unknown, clientMessage?: string) {
    super(message);
    this.name = "AiProviderError";
    this.causeUnknown = causeUnknown;
    this.clientMessage = clientMessage;
  }
}

const AI_TIMEOUT_DEFAULT_USER_MESSAGE =
  "AI is taking longer than the server's allow-list time. Local 7B+ models often need several minutes—increase AI_REQUEST_TIMEOUT_MS (min 180s) and Cloudflare Tunnel ingress timeouts (noResponseTimeoutSeconds / origin timeouts), shorten inputs, or retry.";

export class AiTimeoutError extends Error {
  readonly code = "AI_TIMEOUT" as const;
  constructor(message = AI_TIMEOUT_DEFAULT_USER_MESSAGE) {
    super(message);
    this.name = "AiTimeoutError";
  }
}

export class AiOutputTooLargeError extends Error {
  readonly code = "AI_OUTPUT_TOO_LARGE" as const;
  constructor(message = "AI response exceeded the maximum size.") {
    super(message);
    this.name = "AiOutputTooLargeError";
  }
}
