import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { loadAiRuntimeEnv } from "@/lib/ai/env";
import { checkOllamaHealth } from "@/lib/ai/client";

export const runtime = "nodejs";

/**
 * GET /api/ai/health — ping Ollama and verify the configured model is installed.
 * Requires a signed-in session (or the internal `x-ai-secret` automation header)
 * so the Ollama base URL and model list are not exposed publicly.
 */
export async function GET(req: Request) {
  const session = await requireSession(req);
  if (!session.ok) return session.response;

  try {
    const env = loadAiRuntimeEnv();
    const status = await checkOllamaHealth(env);

    return NextResponse.json(status, {
      status: status.ok ? 200 : 503,
    });
  } catch (e) {
    console.error("[ai] health route error:", e);

    return NextResponse.json(
      {
        ok: false,
        enabled: false,
        reachable: false,
        modelInstalled: false,
        message: "AI health check failed.",
        code: "AI_UNKNOWN",
      },
      { status: 503 }
    );
  }
}
