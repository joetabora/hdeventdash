import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { assertChecklistItemForEvent } from "@/lib/api/event-in-org";
import { updateChecklistItem, deleteChecklistItem } from "@/lib/events";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { getUserRole, canManageEventsRole } from "@/lib/roles";
import {
  checklistManagerPatchSchema,
  checklistStaffPatchSchema,
} from "@/lib/validation/event-mutation-schemas";
import { parseUuidParam, parseWithSchema, readJsonBody } from "@/lib/validation/request-json";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string; itemId: string }> }
) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  const { eventId: rawEventId, itemId: rawItemId } = await context.params;
  const eventCheck = parseUuidParam(rawEventId, "event id");
  if (!eventCheck.ok) return eventCheck.response;
  const itemCheck = parseUuidParam(rawItemId, "checklist item id");
  if (!itemCheck.ok) return itemCheck.response;

  const belongs = await assertChecklistItemForEvent(
    session.supabase,
    eventCheck.id,
    itemCheck.id
  );
  if (!belongs.ok) return belongs.response;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const role = await getUserRole(session.supabase, session.user.id);
  const manager = canManageEventsRole(role);

  try {
    if (manager) {
      const parsed = parseWithSchema(checklistManagerPatchSchema, raw.body);
      if (!parsed.ok) return parsed.response;
      const row = await updateChecklistItem(
        session.supabase,
        itemCheck.id,
        parsed.data
      );
      return NextResponse.json(row);
    }

    const parsed = parseWithSchema(checklistStaffPatchSchema, raw.body);
    if (!parsed.ok) return parsed.response;
    const row = await updateChecklistItem(
      session.supabase,
      itemCheck.id,
      parsed.data
    );
    return NextResponse.json(row);
  } catch (e) {
    console.error("PATCH checklist item:", e);
    return NextResponse.json(
      { error: "Failed to update checklist item." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string; itemId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId: rawEventId, itemId: rawItemId } = await context.params;
  const eventCheck = parseUuidParam(rawEventId, "event id");
  if (!eventCheck.ok) return eventCheck.response;
  const itemCheck = parseUuidParam(rawItemId, "checklist item id");
  if (!itemCheck.ok) return itemCheck.response;

  const belongs = await assertChecklistItemForEvent(
    ctx.supabase,
    eventCheck.id,
    itemCheck.id
  );
  if (!belongs.ok) return belongs.response;

  try {
    await deleteChecklistItem(ctx.supabase, itemCheck.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE checklist item:", e);
    return NextResponse.json(
      { error: "Failed to delete checklist item." },
      { status: 500 }
    );
  }
}
