import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { deleteMonthlyBudget } from "@/lib/budgets";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { data: row, error: fetchError } = await ctx.supabase
    .from("monthly_budgets")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("DELETE /api/budgets/[id] select:", fetchError);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    await deleteMonthlyBudget(ctx.supabase, id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/budgets/[id]:", e);
    return NextResponse.json({ error: "Failed to delete budget." }, { status: 500 });
  }
}
