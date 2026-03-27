import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { upsertMonthlyBudget } from "@/lib/budgets";

export async function POST(request: Request) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const month = typeof o.month === "string" ? o.month.trim() : "";
  const location = typeof o.location === "string" ? o.location.trim() : "";
  const raw = o.budget_amount;
  const budget_amount =
    typeof raw === "number" ? raw : typeof raw === "string" ? parseFloat(raw) : NaN;

  if (!month || !/^\d{4}-\d{2}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "Invalid month (expected YYYY-MM-DD, first of month)." },
      { status: 400 }
    );
  }
  if (!location) {
    return NextResponse.json({ error: "Location is required." }, { status: 400 });
  }
  if (Number.isNaN(budget_amount) || budget_amount < 0) {
    return NextResponse.json(
      { error: "budget_amount must be a non-negative number." },
      { status: 400 }
    );
  }

  try {
    const row = await upsertMonthlyBudget(ctx.supabase, {
      month,
      location,
      budget_amount,
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error("POST /api/budgets:", e);
    return NextResponse.json({ error: "Failed to save budget." }, { status: 500 });
  }
}
