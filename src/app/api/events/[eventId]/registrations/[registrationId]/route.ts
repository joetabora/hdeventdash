import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrationStatusPatchSchema } from "@/lib/validation/event-mutation-schemas";
import {
  parseUuidParam,
  parseWithSchema,
  readJsonBody,
} from "@/lib/validation/request-json";

/**
 * PATCH /api/events/[eventId]/registrations/[registrationId] — change RSVP
 * status (check in / undo / cancel). Open to every org member so staff can
 * run check-in during Live Mode. RLS has no write policies on
 * event_registrations; the org check above is the authorization boundary and
 * the service-role write below is pinned to this event's registration.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string; registrationId: string }> }
) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  const { eventId: rawEventId, registrationId: rawRegId } =
    await context.params;
  const eventIdCheck = parseUuidParam(rawEventId, "event id");
  if (!eventIdCheck.ok) return eventIdCheck.response;
  const regIdCheck = parseUuidParam(rawRegId, "registration id");
  if (!regIdCheck.ok) return regIdCheck.response;

  const inOrg = await assertEventInOrganization(
    session.supabase,
    eventIdCheck.id,
    session.organizationId
  );
  if (!inOrg.ok) return inOrg.response;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;
  const parsed = parseWithSchema(registrationStatusPatchSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server is not configured for registration updates." },
      { status: 503 }
    );
  }

  const status = parsed.data.status;
  const updates: Record<string, unknown> = {
    status,
    checked_in_at: status === "checked_in" ? new Date().toISOString() : null,
  };

  try {
    const { data, error } = await admin
      .from("event_registrations")
      .update(updates)
      .eq("id", regIdCheck.id)
      .eq("event_id", eventIdCheck.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Registration not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error(
      "PATCH /api/events/[eventId]/registrations/[registrationId]:",
      e
    );
    return NextResponse.json(
      { error: "Failed to update registration." },
      { status: 500 }
    );
  }
}
