import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { getEventsForDashboard } from "@/lib/events";
import { eventsToIcs } from "@/lib/event-ics";

export const runtime = "nodejs";

/**
 * GET /api/events/export/ics — download the active org's non-archived events
 * (dashboard window) as an iCalendar file for import into Google/Apple/Outlook.
 */
export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  if (!session.organizationId) {
    return NextResponse.json({ error: "No organization." }, { status: 400 });
  }

  try {
    const events = await getEventsForDashboard(
      session.supabase,
      session.organizationId
    );
    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
      /\/$/,
      ""
    );
    const ics = eventsToIcs(events, appBaseUrl);

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="dealership-events.ics"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("GET /api/events/export/ics:", e);
    return NextResponse.json(
      { error: "Failed to export calendar." },
      { status: 500 }
    );
  }
}
