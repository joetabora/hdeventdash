import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import { addComment } from "@/lib/events";
import { commentCreateSchema } from "@/lib/validation/event-mutation-schemas";
import { parseUuidParam, parseWithSchema, readJsonBody } from "@/lib/validation/request-json";

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId: rawEventId } = await context.params;
  const idCheck = parseUuidParam(rawEventId, "event id");
  if (!idCheck.ok) return idCheck.response;

  const inOrg = await assertEventInOrganization(ctx.supabase, idCheck.id);
  if (!inOrg.ok) return inOrg.response;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(commentCreateSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    const row = await addComment(ctx.supabase, {
      event_id: idCheck.id,
      user_id: ctx.user.id,
      user_email: ctx.user.email ?? "unknown",
      content: parsed.data.content,
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error("POST /api/events/[eventId]/comments:", e);
    return NextResponse.json({ error: "Failed to post comment." }, { status: 500 });
  }
}
