import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { createVendor, listVendorsPaginated } from "@/lib/vendors";
import { vendorCreateSchema } from "@/lib/validation/api-schemas";
import { parseWithSchema, readJsonBody } from "@/lib/validation/request-json";

export async function GET(request: Request) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const rawSize = parseInt(searchParams.get("pageSize") ?? "25", 10) || 25;
  const pageSize = Math.min(50, Math.max(1, rawSize));
  const q = searchParams.get("q") ?? "";

  try {
    const result = await listVendorsPaginated(ctx.supabase, {
      page,
      pageSize,
      search: q,
    });
    const hasMore = result.page * result.pageSize < result.total;
    return NextResponse.json({ ...result, hasMore });
  } catch (e) {
    console.error("GET /api/vendors:", e);
    return NextResponse.json(
      { error: "Failed to list vendors." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(vendorCreateSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    const vendor = await createVendor(ctx.supabase, {
      ...parsed.data,
      organization_id: ctx.organizationId,
    });
    return NextResponse.json(vendor);
  } catch (e) {
    console.error("POST /api/vendors:", e);
    return NextResponse.json(
      { error: "Failed to create vendor." },
      { status: 500 }
    );
  }
}
