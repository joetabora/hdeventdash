import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { aiCompleteRequestSchema } from "@/lib/validation/ai-schemas";
import { parseWithSchema, readJsonBody } from "@/lib/validation/request-json";
import { runAiPromptTemplate } from "@/lib/ai/run-template";
import { aiClientFailureResponse } from "@/lib/ai/http-errors";
import { toAiClientFailure } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const session = await requireSession(req);
  if (!session.ok) return session.response;

  const raw = await readJsonBody(req);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(aiCompleteRequestSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await runAiPromptTemplate({
      templateId: parsed.data.templateId,
      variables: parsed.data.variables,
      model: parsed.data.model,
      temperature: parsed.data.temperature,
    });

    if (!result.ok) return result.response;

    return NextResponse.json({
      text: result.text,
      templateId: result.templateId,
      templateVersion: result.templateVersion,
      model: result.model,
    });
  } catch (e) {
    return aiClientFailureResponse(toAiClientFailure(e));
  }
}
