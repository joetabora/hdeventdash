import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { requireSession } from "@/lib/api/require-session";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import { getSwapMeetSpots, addSwapMeetSpot } from "@/lib/events";
import { swapMeetSpotCreateSchema } from "@/lib/validation/event-mutation-schemas";
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
    const spots = await getSwapMeetSpots(session.supabase, eventCheck.id);
    return NextResponse.json({ spots });
  } catch (e) {
    console.error("GET /api/events/[eventId]/swap-meet:", e);
    return NextResponse.json({ error: "Failed to load swap meet spots." }, { status: 500 });
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

  const inOrg = await assertEventInOrganization(
    ctx.supabase,
    eventCheck.id,
    ctx.organizationId
  );
  if (!inOrg.ok) return inOrg.response;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(swapMeetSpotCreateSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    const spot = await addSwapMeetSpot(ctx.supabase, eventCheck.id, parsed.data);
    return NextResponse.json(spot);
  } catch (e) {
    console.error("POST /api/events/[eventId]/swap-meet:", e);
    return NextResponse.json({ error: "Failed to add swap meet spot." }, { status: 500 });
  }
}
