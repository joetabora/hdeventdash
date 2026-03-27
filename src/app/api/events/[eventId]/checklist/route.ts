import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import { addChecklistItem } from "@/lib/events";
import { checklistItemCreateSchema } from "@/lib/validation/event-mutation-schemas";
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

  const parsed = parseWithSchema(checklistItemCreateSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    const row = await addChecklistItem(ctx.supabase, {
      event_id: idCheck.id,
      section: parsed.data.section,
      label: parsed.data.label,
      sort_order: parsed.data.sort_order,
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error("POST /api/events/[eventId]/checklist:", e);
    return NextResponse.json(
      { error: "Failed to add checklist item." },
      { status: 500 }
    );
  }
}
