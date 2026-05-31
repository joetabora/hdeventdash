import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import { getEvent } from "@/lib/events";
import { aiCompleteRequestSchema } from "@/lib/validation/ai-schemas";
import { parseUuidParam, parseWithSchema, readJsonBody } from "@/lib/validation/request-json";
import { mergeClientVarsWithEvent } from "@/lib/ai/event-template-vars";
import { runAiPromptTemplate } from "@/lib/ai/run-template";
import { aiClientFailureResponse } from "@/lib/ai/http-errors";
import { toAiClientFailure } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  if (!session.organizationId) {
    return NextResponse.json(
      { error: "No organization membership.", code: "AI_UNKNOWN" },
      { status: 400 }
    );
  }

  const { eventId: rawEventId } = await context.params;
  const idCheck = parseUuidParam(rawEventId, "event id");
  if (!idCheck.ok) return idCheck.response;

  const inOrg = await assertEventInOrganization(
    session.supabase,
    idCheck.id,
    session.organizationId
  );
  if (!inOrg.ok) return inOrg.response;

  let event;
  try {
    event = await getEvent(session.supabase, idCheck.id, session.organizationId);
  } catch {
    return NextResponse.json({ error: "Event not found.", code: "AI_UNKNOWN" }, { status: 404 });
  }

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(aiCompleteRequestSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  const mergedVars = mergeClientVarsWithEvent(event, parsed.data.variables);

  try {
    const result = await runAiPromptTemplate({
      templateId: parsed.data.templateId,
      variables: mergedVars,
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
