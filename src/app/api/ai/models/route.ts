import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { listAllowedModelIds } from "@/lib/ai/chat-service";
import { loadAiRuntimeEnv } from "@/lib/ai/env";
import { listInstalledModelNamesSafe } from "@/lib/ai/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session.ok) return session.response;
    if (!session.organizationId) {
      return NextResponse.json(
        { error: "No organization membership.", code: "AI_UNKNOWN" },
        { status: 400 }
      );
    }

    const env = loadAiRuntimeEnv();
    if (!env.enabled) {
      return NextResponse.json({
        enabled: false,
        models: [] as string[],
        installed: [],
      });
    }

    const tagsResult = await listInstalledModelNamesSafe(env);
    const installed = tagsResult.ok ? tagsResult.data : [];

    const allowed = listAllowedModelIds();
    const models =
      allowed.length > 0
        ? allowed.filter((m) => installed.length === 0 || installed.includes(m))
        : installed.length > 0
          ? installed.filter((m) => m === env.defaultModel)
          : [env.defaultModel];

    return NextResponse.json({
      enabled: true,
      models:
        models.length > 0 ? models : allowed.length > 0 ? allowed : [env.defaultModel],
      installed,
      defaultModel: env.defaultModel,
      baseUrl: env.ollamaBaseUrl,
      ...(tagsResult.ok
        ? {}
        : { warning: tagsResult.error, code: tagsResult.code }),
    });
  } catch (e) {
    console.error("[ai] models route error:", e);
    return NextResponse.json(
      {
        enabled: false,
        models: [],
        installed: [],
        error: "Could not load AI models.",
        code: "AI_UNKNOWN",
      },
      { status: 503 }
    );
  }
}
