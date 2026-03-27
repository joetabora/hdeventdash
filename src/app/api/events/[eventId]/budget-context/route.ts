import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import { getEvent, getEventBudgetSummariesForMonth } from "@/lib/events";
import { eventDateToYearMonth } from "@/lib/budgets";
import { parseUuidParam } from "@/lib/validation/request-json";

/**
 * Monthly planned-budget peer events for cap checks on an existing event.
 * Requires the event id in scope (org + membership). Omit `month` to use the event’s date month.
 */
export async function GET(
  request: Request,
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

  let month = new URL(request.url).searchParams.get("month")?.trim() ?? "";
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "Invalid month (expected YYYY-MM)." },
      { status: 400 }
    );
  }

  if (!month) {
    try {
      const ev = await getEvent(session.supabase, idCheck.id);
      month = eventDateToYearMonth(ev.date);
    } catch {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
  }

  try {
    const events = await getEventBudgetSummariesForMonth(
      session.supabase,
      month
    );
    return NextResponse.json({ events });
  } catch (e) {
    console.error("GET /api/events/[eventId]/budget-context:", e);
    return NextResponse.json(
      { error: "Failed to load budget context." },
      { status: 500 }
    );
  }
}
