import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { getEventBudgetSummariesForMonth } from "@/lib/events";

export async function GET(request: Request) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const month = new URL(request.url).searchParams.get("month")?.trim() ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "Invalid month (expected YYYY-MM)." },
      { status: 400 }
    );
  }

  try {
    const events = await getEventBudgetSummariesForMonth(ctx.supabase, month);
    return NextResponse.json({ events });
  } catch (e) {
    console.error("GET /api/events/budget-context:", e);
    return NextResponse.json(
      { error: "Failed to load budget context." },
      { status: 500 }
    );
  }
}
