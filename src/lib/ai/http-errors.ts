import { NextResponse } from "next/server";
import type { AiClientFailure } from "@/lib/ai/client";
import { toAiClientFailure } from "@/lib/ai/client";

export function aiClientFailureResponse(failure: AiClientFailure): NextResponse {
  return NextResponse.json(
    { error: failure.error, code: failure.code },
    { status: failure.status }
  );
}

/** Catch-all for unexpected throws in AI routes — always returns structured JSON. */
export function aiExceptionResponse(error: unknown): NextResponse {
  return aiClientFailureResponse(toAiClientFailure(error));
}
