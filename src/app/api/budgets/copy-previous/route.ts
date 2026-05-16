import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { copyPreviousMonthBudgets } from "@/lib/budgets";
import { budgetCopyPreviousSchema } from "@/lib/validation/api-schemas";
import { parseWithSchema, readJsonBody } from "@/lib/validation/request-json";

export async function POST(request: Request) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(budgetCopyPreviousSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    const copied = await copyPreviousMonthBudgets(
      ctx.supabase,
      parsed.data.targetMonth,
      ctx.organizationId
    );
    return NextResponse.json({ ok: true, copied });
  } catch (e) {
    console.error("POST /api/budgets/copy-previous:", e);
    return NextResponse.json(
      { error: "Failed to copy budgets from previous month." },
      { status: 500 }
    );
  }
}
