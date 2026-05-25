import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { loadAiRuntimeEnv } from "@/lib/ai/env";
import { checkOllamaHealth } from "@/lib/ai/ollama-client";

/** GET /api/ai/health — ping Ollama and verify the configured model is installed. */
export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;

  const env = loadAiRuntimeEnv();
  const status = await checkOllamaHealth(env);

  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
