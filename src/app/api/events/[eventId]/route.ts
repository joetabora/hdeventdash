import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import { updateEvent, deleteEvent } from "@/lib/events";
import { getUserRole, canManageEventsRole, isAdmin } from "@/lib/roles";
import {
  eventManagerPatchSchema,
  eventStaffPatchSchema,
} from "@/lib/validation/event-mutation-schemas";
import { parseUuidParam, parseWithSchema, readJsonBody } from "@/lib/validation/request-json";

function normalizeManagerPatch(
  patch: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...patch };
  if (next.onedrive_link === "") next.onedrive_link = null;
  return next;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  const { eventId: rawEventId } = await context.params;
  const idCheck = parseUuidParam(rawEventId, "event id");
  if (!idCheck.ok) return idCheck.response;

  const inOrg = await assertEventInOrganization(
    session.supabase,
    idCheck.id,
    session.organizationId
  );
  if (!inOrg.ok) return inOrg.response;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const role = await getUserRole(
    session.supabase,
    session.user.id,
    session.organizationId
  );
  const manager = canManageEventsRole(role);

  try {
    if (manager) {
      const normalized = normalizeManagerPatch(
        raw.body as Record<string, unknown>
      );
      const parsed = parseWithSchema(eventManagerPatchSchema, normalized);
      if (!parsed.ok) return parsed.response;
      const row = await updateEvent(session.supabase, idCheck.id, parsed.data);
      return NextResponse.json(row);
    }

    const parsed = parseWithSchema(eventStaffPatchSchema, raw.body);
    if (!parsed.ok) return parsed.response;
    const row = await updateEvent(session.supabase, idCheck.id, parsed.data);
    return NextResponse.json(row);
  } catch (e) {
    console.error("PATCH /api/events/[eventId]:", e);
    const detail =
      e && typeof e === "object" && "message" in e
        ? String((e as { message: string }).message)
        : "Unknown error";
    return NextResponse.json(
      { error: `Failed to update event: ${detail}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  const { eventId: rawEventId } = await context.params;
  const idCheck = parseUuidParam(rawEventId, "event id");
  if (!idCheck.ok) return idCheck.response;

  const inOrg = await assertEventInOrganization(
    session.supabase,
    idCheck.id,
    session.organizationId
  );
  if (!inOrg.ok) return inOrg.response;

  const admin = await isAdmin(
    session.supabase,
    session.user.id,
    session.organizationId
  );
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deleteEvent(session.supabase, idCheck.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/events/[eventId]:", e);
    return NextResponse.json({ error: "Failed to delete event." }, { status: 500 });
  }
}
