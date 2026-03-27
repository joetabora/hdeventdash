import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { createVendor } from "@/lib/vendors";
import { vendorCreateSchema } from "@/lib/validation/api-schemas";
import { parseWithSchema, readJsonBody } from "@/lib/validation/request-json";

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
