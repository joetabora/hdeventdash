import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { getCurrentOrganizationId } from "@/lib/organization";
import { attachVendorToEvent } from "@/lib/vendors";
import type { VendorParticipationStatus } from "@/types/database";

const PARTICIPATION: VendorParticipationStatus[] = [
  "invited",
  "confirmed",
  "declined",
  "participated",
  "cancelled",
];

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId } = await context.params;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event id." }, { status: 400 });
  }

  const orgId = await getCurrentOrganizationId(ctx.supabase);
  if (!orgId) {
    return NextResponse.json({ error: "No organization." }, { status: 400 });
  }

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const vendor_id = typeof b.vendor_id === "string" ? b.vendor_id.trim() : "";
  if (!vendor_id) {
    return NextResponse.json({ error: "vendor_id is required." }, { status: 400 });
  }

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

  let participation_status: VendorParticipationStatus | undefined;
  if (typeof b.participation_status === "string") {
    if (!PARTICIPATION.includes(b.participation_status as VendorParticipationStatus)) {
      return NextResponse.json(
        { error: "Invalid participation_status." },
        { status: 400 }
      );
    }
    participation_status = b.participation_status as VendorParticipationStatus;
  }

  try {
    const link = await attachVendorToEvent(ctx.supabase, {
      event_id: eventId,
      vendor_id,
      role: typeof b.role === "string" ? b.role : "",
      notes: typeof b.notes === "string" ? b.notes : "",
      ...(participation_status ? { participation_status } : {}),
    });
    return NextResponse.json(link);
  } catch (e) {
    console.error("POST /api/events/[eventId]/vendors:", e);
    return NextResponse.json({ error: "Failed to attach vendor." }, { status: 500 });
  }
}
