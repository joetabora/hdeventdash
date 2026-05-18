import { NextResponse } from "next/server";
import {
  AiDisabledError,
  AiModelNotAllowedError,
  AiOutputTooLargeError,
  AiProviderError,
  AiTimeoutError,
} from "@/lib/ai/errors";

export function aiExceptionResponse(error: unknown): NextResponse {
  if (error instanceof AiDisabledError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof AiModelNotAllowedError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof AiTimeoutError) {
    return NextResponse.json({ error: error.message }, { status: 504 });
  }
  if (error instanceof AiOutputTooLargeError) {
    return NextResponse.json({ error: error.message }, { status: 413 });
  }
  if (error instanceof AiProviderError) {
    console.error("AiProviderError:", error.message, error.causeUnknown);
    return NextResponse.json(
      {
        error:
          error.clientMessage ??
          "AI provider failed to complete the request.",
      },
      { status: 502 }
    );
  }
  console.error("Unexpected AI route error:", error);
  return NextResponse.json({ error: "AI request failed." }, { status: 500 });
}
