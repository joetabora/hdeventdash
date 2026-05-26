import { NextResponse } from "next/server";
import { loadAiRuntimeEnv } from "@/lib/ai/env";
import { checkOllamaHealth } from "@/lib/ai/client";

export const runtime = "nodejs";

/** GET /api/ai/health — ping Ollama and verify the configured model is installed. */
export async function GET() {
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
