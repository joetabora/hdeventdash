import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { upsertMonthlyBudget } from "@/lib/budgets";
import { budgetUpsertSchema } from "@/lib/validation/api-schemas";
import { parseWithSchema, readJsonBody } from "@/lib/validation/request-json";

export async function POST(request: Request) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(budgetUpsertSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    const row = await upsertMonthlyBudget(ctx.supabase, {
      month: parsed.data.month,
      location: parsed.data.location,
      budget_amount: parsed.data.budget_amount,
      organizationId: ctx.organizationId,
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error("POST /api/budgets:", e);
    return NextResponse.json({ error: "Failed to save budget." }, { status: 500 });
  }
}
