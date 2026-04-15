import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { requireSession } from "@/lib/api/require-session";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import { attachVendorToEvent, getActiveEventVendors } from "@/lib/vendors";
import { attachEventVendorSchema } from "@/lib/validation/api-schemas";
import { parseUuidParam, parseWithSchema, readJsonBody } from "@/lib/validation/request-json";

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  const { eventId: rawEventId } = await context.params;
  const eventCheck = parseUuidParam(rawEventId, "event id");
  if (!eventCheck.ok) return eventCheck.response;

  const inOrg = await assertEventInOrganization(
    session.supabase,
    eventCheck.id,
    session.organizationId
  );
  if (!inOrg.ok) return inOrg.response;

  try {
    const eventVendors = await getActiveEventVendors(
      session.supabase,
      eventCheck.id
    );
    return NextResponse.json({ eventVendors });
  } catch (e) {
    console.error("GET /api/events/[eventId]/vendors:", e);
    return NextResponse.json(
      { error: "Failed to load event vendors." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId: rawEventId } = await context.params;
  const eventCheck = parseUuidParam(rawEventId, "event id");
  if (!eventCheck.ok) return eventCheck.response;
  const eventId = eventCheck.id;

  const orgId = ctx.organizationId;

  const { data: ev, error: evError } = await ctx.supabase
    .from("events")
    .select("id, organization_id")
    .eq("id", eventId)
    .maybeSingle();

  if (evError) {
    console.error("POST event vendors event:", evError);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!ev || ev.organization_id !== orgId) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(attachEventVendorSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  const { vendor_id, role, notes, participation_status, agreed_fee, fee_notes } = parsed.data;

  const { data: vendor, error: vError } = await ctx.supabase
    .from("vendors")
    .select("id, organization_id")
    .eq("id", vendor_id)
    .maybeSingle();

  if (vError) {
    console.error("POST event vendors vendor:", vError);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!vendor || vendor.organization_id !== orgId) {
    return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  }

  try {
    const link = await attachVendorToEvent(ctx.supabase, {
      event_id: eventId,
      vendor_id,
      role,
      notes,
      agreed_fee: agreed_fee ?? null,
      fee_notes: fee_notes ?? "",
      ...(participation_status ? { participation_status } : {}),
    });
    return NextResponse.json(link);
  } catch (e) {
    console.error("POST /api/events/[eventId]/vendors:", e);
    return NextResponse.json({ error: "Failed to attach vendor." }, { status: 500 });
  }
}
