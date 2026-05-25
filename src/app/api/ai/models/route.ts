import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { listAllowedModelIds } from "@/lib/ai/chat-service";
import { loadAiRuntimeEnv } from "@/lib/ai/env";
import { listInstalledModelNames } from "@/lib/ai/ollama-client";

export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  if (!session.organizationId) {
    return NextResponse.json(
      { error: "No organization membership." },
      { status: 400 }
    );
  }

  const env = loadAiRuntimeEnv();
  if (!env.enabled) {
    return NextResponse.json({ enabled: false, models: [] as string[], installed: [] });
  }

  let installed: string[] = [];
  try {
    installed = await listInstalledModelNames(env);
  } catch {
    installed = [];
  }

  const allowed = listAllowedModelIds();
  const models =
    allowed.length > 0
      ? allowed.filter((m) => installed.length === 0 || installed.includes(m))
      : installed.length > 0
        ? installed.filter((m) => m === env.defaultModel)
        : [env.defaultModel];

  return NextResponse.json({
    enabled: true,
    models: models.length > 0 ? models : allowed.length > 0 ? allowed : [env.defaultModel],
    installed,
    defaultModel: env.defaultModel,
  });
}
