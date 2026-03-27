import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { updateEventVendor, detachVendorFromEvent } from "@/lib/vendors";
import { eventVendorPatchSchema } from "@/lib/validation/api-schemas";
import {
  parseUuidParam,
  parseWithSchema,
  readJsonBody,
} from "@/lib/validation/request-json";

async function assertLinkInOrgEvent(
  supabase: SupabaseClient,
  eventId: string,
  linkId: string,
  orgId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { data: link, error } = await supabase
    .from("event_vendors")
    .select("id, event_id, vendor_id")
    .eq("id", linkId)
    .maybeSingle();

  if (error) {
    console.error("event_vendors link lookup:", error);
    return {
      ok: false,
      response: NextResponse.json({ error: "Lookup failed." }, { status: 500 }),
    };
  }
  if (!link || link.event_id !== eventId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found." }, { status: 404 }),
    };
  }

  const { data: ev } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!ev || ev.organization_id !== orgId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found." }, { status: 404 }),
    };
  }

  return { ok: true };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string; linkId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId: rawEventId, linkId: rawLinkId } = await context.params;
  const eventCheck = parseUuidParam(rawEventId, "event id");
  if (!eventCheck.ok) return eventCheck.response;
  const eventId = eventCheck.id;

  const linkCheck = parseUuidParam(rawLinkId, "link id");
  if (!linkCheck.ok) return linkCheck.response;
  const linkId = linkCheck.id;

  const gate = await assertLinkInOrgEvent(
    ctx.supabase,
    eventId,
    linkId,
    ctx.organizationId
  );
  if (!gate.ok) return gate.response;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(eventVendorPatchSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    const row = await updateEventVendor(ctx.supabase, linkId, parsed.data);
    return NextResponse.json(row);
  } catch (e) {
    console.error("PATCH event vendor link:", e);
    return NextResponse.json(
      { error: "Failed to update link." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string; linkId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId: rawEventId, linkId: rawLinkId } = await context.params;
  const eventCheck = parseUuidParam(rawEventId, "event id");
  if (!eventCheck.ok) return eventCheck.response;
  const eventId = eventCheck.id;

  const linkCheck = parseUuidParam(rawLinkId, "link id");
  if (!linkCheck.ok) return linkCheck.response;
  const linkId = linkCheck.id;

  const gate = await assertLinkInOrgEvent(
    ctx.supabase,
    eventId,
    linkId,
    ctx.organizationId
  );
  if (!gate.ok) return gate.response;

  try {
    await detachVendorFromEvent(ctx.supabase, linkId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE event vendor detach:", e);
    return NextResponse.json(
      { error: "Failed to detach vendor." },
      { status: 500 }
    );
  }
}
