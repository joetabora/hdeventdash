import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { loadEventDocumentForEvent } from "@/lib/api/event-in-org";
import { deleteDocument } from "@/lib/events";
import { parseUuidParam } from "@/lib/validation/request-json";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string; documentId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId: rawEventId, documentId: rawDocId } = await context.params;
  const eventCheck = parseUuidParam(rawEventId, "event id");
  if (!eventCheck.ok) return eventCheck.response;
  const docCheck = parseUuidParam(rawDocId, "document id");
  if (!docCheck.ok) return docCheck.response;

  const loaded = await loadEventDocumentForEvent(
    ctx.supabase,
    eventCheck.id,
    docCheck.id,
    ctx.organizationId
  );
  if (!loaded.ok) return loaded.response;

  try {
    await deleteDocument(ctx.supabase, loaded.doc);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE document:", e);
    return NextResponse.json({ error: "Failed to delete document." }, { status: 500 });
  }
}
