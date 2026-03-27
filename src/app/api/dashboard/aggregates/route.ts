import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { fetchDashboardAggregates } from "@/lib/dashboard-aggregates";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  if (!session.organizationId) {
    return NextResponse.json(
      { error: "No organization membership." },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const budgetMonth = url.searchParams.get("budgetMonth") ?? "";
  const budgetLocationKey = url.searchParams.get("budgetLocationKey") ?? "";
  const search = url.searchParams.get("search") ?? "";
  const locationKey = url.searchParams.get("locationKey") ?? "";
  const owner = url.searchParams.get("owner") ?? "";

  try {
    const aggregates = await fetchDashboardAggregates(session.supabase, {
      budgetMonth,
      budgetLocationKey,
      search,
      locationKey,
      owner,
    });
    return NextResponse.json(aggregates);
  } catch (e) {
    console.error("GET /api/dashboard/aggregates:", e);
    return NextResponse.json(
      { error: "Failed to load dashboard aggregates." },
      { status: 500 }
    );
  }
}
