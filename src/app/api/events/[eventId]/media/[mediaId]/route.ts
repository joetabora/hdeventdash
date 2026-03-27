import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { loadEventMediaForEvent } from "@/lib/api/event-in-org";
import { deleteMedia } from "@/lib/events";
import { parseUuidParam } from "@/lib/validation/request-json";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string; mediaId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId: rawEventId, mediaId: rawMediaId } = await context.params;
  const eventCheck = parseUuidParam(rawEventId, "event id");
  if (!eventCheck.ok) return eventCheck.response;
  const mediaCheck = parseUuidParam(rawMediaId, "media id");
  if (!mediaCheck.ok) return mediaCheck.response;

  const loaded = await loadEventMediaForEvent(
    ctx.supabase,
    eventCheck.id,
    mediaCheck.id
  );
  if (!loaded.ok) return loaded.response;

  try {
    await deleteMedia(ctx.supabase, loaded.media);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE media:", e);
    return NextResponse.json({ error: "Failed to delete media." }, { status: 500 });
  }
}
