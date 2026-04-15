import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { updateSwapMeetSpot, deleteSwapMeetSpot, uploadSwapMeetWaiver } from "@/lib/events";
import { validateEventUploadFile } from "@/lib/validation/upload-file";
import { swapMeetSpotPatchSchema } from "@/lib/validation/event-mutation-schemas";
import { parseUuidParam, parseWithSchema, readJsonBody } from "@/lib/validation/request-json";
import { assertEventInOrganization } from "@/lib/api/event-in-org";

async function assertSpotInEvent(
  supabase: Parameters<typeof assertEventInOrganization>[0],
  spotId: string,
  eventId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { data, error } = await supabase
    .from("swap_meet_spots")
    .select("id, event_id")
    .eq("id", spotId)
    .maybeSingle();
  if (error) {
    return { ok: false, response: NextResponse.json({ error: "Lookup failed." }, { status: 500 }) };
  }
  if (!data || data.event_id !== eventId) {
    return { ok: false, response: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  }
  return { ok: true };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string; spotId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId: rawEventId, spotId: rawSpotId } = await context.params;
  const eventCheck = parseUuidParam(rawEventId, "event id");
  if (!eventCheck.ok) return eventCheck.response;
  const spotCheck = parseUuidParam(rawSpotId, "spot id");
  if (!spotCheck.ok) return spotCheck.response;

  const inOrg = await assertEventInOrganization(ctx.supabase, eventCheck.id, ctx.organizationId);
  if (!inOrg.ok) return inOrg.response;

  const spotGate = await assertSpotInEvent(ctx.supabase, spotCheck.id, eventCheck.id);
  if (!spotGate.ok) return spotGate.response;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const fd = await request.formData();
      const file = fd.get("waiver") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No waiver file provided." }, { status: 400 });
      }
      validateEventUploadFile(file);
      const spot = await uploadSwapMeetWaiver(
        ctx.supabase,
        ctx.organizationId,
        eventCheck.id,
        spotCheck.id,
        file
      );
      return NextResponse.json(spot);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(swapMeetSpotPatchSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    const spot = await updateSwapMeetSpot(ctx.supabase, spotCheck.id, parsed.data);
    return NextResponse.json(spot);
  } catch (e) {
    console.error("PATCH swap meet spot:", e);
    return NextResponse.json({ error: "Failed to update spot." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string; spotId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId: rawEventId, spotId: rawSpotId } = await context.params;
  const eventCheck = parseUuidParam(rawEventId, "event id");
  if (!eventCheck.ok) return eventCheck.response;
  const spotCheck = parseUuidParam(rawSpotId, "spot id");
  if (!spotCheck.ok) return spotCheck.response;

  const inOrg = await assertEventInOrganization(ctx.supabase, eventCheck.id, ctx.organizationId);
  if (!inOrg.ok) return inOrg.response;

  const spotGate = await assertSpotInEvent(ctx.supabase, spotCheck.id, eventCheck.id);
  if (!spotGate.ok) return spotGate.response;

  try {
    await deleteSwapMeetSpot(ctx.supabase, spotCheck.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE swap meet spot:", e);
    return NextResponse.json({ error: "Failed to delete spot." }, { status: 500 });
  }
}
