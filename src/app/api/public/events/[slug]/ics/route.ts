import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventsToIcs } from "@/lib/event-ics";
import type { Event } from "@/types/database";

export const runtime = "nodejs";

/**
 * GET /api/public/events/[slug]/ics — calendar file for one public event
 * (the "Add to calendar" button on the RSVP confirmation screen).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const { data: event, error } = await admin
    .from("events")
    .select(
      "id, name, date, location, description, event_time_start, event_time_end"
    )
    .eq("public_slug", slug.trim().toLowerCase())
    .eq("registration_enabled", true)
    .eq("is_archived", false)
    .maybeSingle();

  if (error || !event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Public file: omit the internal app link (empty base URL).
  const ics = eventsToIcs([event as Event], "");
  const filename = `${event.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "event"}.ics`;

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
