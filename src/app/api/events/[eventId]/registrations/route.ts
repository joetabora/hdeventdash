import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import { parseUuidParam } from "@/lib/validation/request-json";
import type { EventRegistration } from "@/types/database";

/** GET /api/events/[eventId]/registrations — attendee list (any org member). */
export async function GET(
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

  const { data, error } = await session.supabase
    .from("event_registrations")
    .select("*")
    .eq("event_id", idCheck.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET /api/events/[eventId]/registrations:", error);
    return NextResponse.json(
      { error: "Failed to load registrations." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    registrations: (data ?? []) as EventRegistration[],
  });
}
