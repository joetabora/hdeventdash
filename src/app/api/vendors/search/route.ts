import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { listVendorsPaginated } from "@/lib/vendors";

const MAX_LIMIT = 50;

/**
 * Directory search for attaching vendors to events (managers).
 * Does not return the full org vendor list — use paginated GET /api/vendors for directory pages.
 */
export async function GET(request: Request) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const rawLimit = parseInt(searchParams.get("limit") ?? "40", 10) || 40;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));

  try {
    const result = await listVendorsPaginated(ctx.supabase, {
      page: 1,
      pageSize: limit,
      search: q,
    });
    return NextResponse.json({ vendors: result.vendors });
  } catch (e) {
    console.error("GET /api/vendors/search:", e);
    return NextResponse.json(
      { error: "Failed to search vendors." },
      { status: 500 }
    );
  }
}
