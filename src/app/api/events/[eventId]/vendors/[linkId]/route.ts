import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { getCurrentOrganizationId } from "@/lib/organization";
import {
  updateEventVendor,
  detachVendorFromEvent,
} from "@/lib/vendors";
import type { VendorParticipationStatus } from "@/types/database";

const PARTICIPATION: VendorParticipationStatus[] = [
  "invited",
  "confirmed",
  "declined",
  "participated",
  "cancelled",
];

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

  const { eventId, linkId } = await context.params;
  if (!eventId || !linkId) {
    return NextResponse.json({ error: "Missing parameters." }, { status: 400 });
  }

  const orgId = await getCurrentOrganizationId(ctx.supabase);
  if (!orgId) {
    return NextResponse.json({ error: "No organization." }, { status: 400 });
  }

  const gate = await assertLinkInOrgEvent(ctx.supabase, eventId, linkId, orgId);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const updates: Parameters<typeof updateEventVendor>[2] = {};
  if (typeof b.role === "string") updates.role = b.role;
  if (typeof b.notes === "string") updates.notes = b.notes;
  if (typeof b.participation_status === "string") {
    if (!PARTICIPATION.includes(b.participation_status as VendorParticipationStatus)) {
      return NextResponse.json(
        { error: "Invalid participation_status." },
        { status: 400 }
      );
    }
    updates.participation_status =
      b.participation_status as VendorParticipationStatus;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  try {
    const row = await updateEventVendor(ctx.supabase, linkId, updates);
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

  const { eventId, linkId } = await context.params;
  if (!eventId || !linkId) {
    return NextResponse.json({ error: "Missing parameters." }, { status: 400 });
  }

  const orgId = await getCurrentOrganizationId(ctx.supabase);
  if (!orgId) {
    return NextResponse.json({ error: "No organization." }, { status: 400 });
  }

  const gate = await assertLinkInOrgEvent(ctx.supabase, eventId, linkId, orgId);
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
