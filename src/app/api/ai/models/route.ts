import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { listAllowedModelIds } from "@/lib/ai/chat-service";
import { loadAiRuntimeEnv } from "@/lib/ai/env";

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
    return NextResponse.json({ enabled: false, models: [] as string[] });
  }

  return NextResponse.json({
    enabled: true,
    models: listAllowedModelIds(),
    defaultModel: env.defaultModel,
  });
}
