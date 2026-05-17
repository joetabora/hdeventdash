import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { aiCompleteRequestSchema } from "@/lib/validation/ai-schemas";
import { parseWithSchema, readJsonBody } from "@/lib/validation/request-json";
import { runAiPromptTemplate } from "@/lib/ai/run-template";
import { aiExceptionResponse } from "@/lib/ai/http-errors";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  if (!session.organizationId) {
    return NextResponse.json(
      { error: "No organization membership." },
      { status: 400 }
    );
  }

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(aiCompleteRequestSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await runAiPromptTemplate({
      templateId: parsed.data.templateId,
      variables: parsed.data.variables,
      model: parsed.data.model,
      signal: request.signal,
    });
    if (!result.ok) return result.response;
    return NextResponse.json({
      text: result.text,
      templateId: result.templateId,
      templateVersion: result.templateVersion,
      model: result.model,
    });
  } catch (e) {
    return aiExceptionResponse(e);
  }
}
