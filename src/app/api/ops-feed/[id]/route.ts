import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import {
  deleteOpsFeedEntry,
  getOpsFeedEntry,
  updateOpsFeedEntry,
} from "@/lib/ops-feed";
import { opsFeedEntryPatchSchema } from "@/lib/validation/ops-feed-schemas";
import {
  parseUuidParam,
  parseWithSchema,
  readJsonBody,
} from "@/lib/validation/request-json";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  if (!session.organizationId) {
    return NextResponse.json(
      { error: "No organization selected." },
      { status: 403 }
    );
  }

  const { id: rawId } = await context.params;
  const idCheck = parseUuidParam(rawId, "id");
  if (!idCheck.ok) return idCheck.response;

  const existing = await getOpsFeedEntry(
    session.supabase,
    idCheck.id,
    session.organizationId
  );
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(opsFeedEntryPatchSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.event_id) {
    const inOrg = await assertEventInOrganization(
      session.supabase,
      parsed.data.event_id,
      session.organizationId
    );
    if (!inOrg.ok) return inOrg.response;
  }

  try {
    const entry = await updateOpsFeedEntry(
      session.supabase,
      idCheck.id,
      parsed.data
    );
    return NextResponse.json(entry);
  } catch (e) {
    console.error("PATCH /api/ops-feed/[id]:", e);
    return NextResponse.json(
      { error: "Failed to update ops feed entry." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  if (!session.organizationId) {
    return NextResponse.json(
      { error: "No organization selected." },
      { status: 403 }
    );
  }

  const { id: rawId } = await context.params;
  const idCheck = parseUuidParam(rawId, "id");
  if (!idCheck.ok) return idCheck.response;

  const existing = await getOpsFeedEntry(
    session.supabase,
    idCheck.id,
    session.organizationId
  );
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    await deleteOpsFeedEntry(session.supabase, idCheck.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/ops-feed/[id]:", e);
    return NextResponse.json(
      { error: "Failed to delete ops feed entry." },
      { status: 500 }
    );
  }
}
