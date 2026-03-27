import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { updateVendor, deleteVendor } from "@/lib/vendors";
import { vendorPatchSchema } from "@/lib/validation/api-schemas";
import {
  parseUuidParam,
  parseWithSchema,
  readJsonBody,
} from "@/lib/validation/request-json";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { id: rawId } = await context.params;
  const idCheck = parseUuidParam(rawId, "id");
  if (!idCheck.ok) return idCheck.response;
  const id = idCheck.id;

  const { data: existing, error: fetchError } = await ctx.supabase
    .from("vendors")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("PATCH /api/vendors/[id] select:", fetchError);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(vendorPatchSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    const vendor = await updateVendor(ctx.supabase, id, parsed.data);
    return NextResponse.json(vendor);
  } catch (e) {
    console.error("PATCH /api/vendors/[id]:", e);
    return NextResponse.json(
      { error: "Failed to update vendor." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { id: rawId } = await context.params;
  const idCheck = parseUuidParam(rawId, "id");
  if (!idCheck.ok) return idCheck.response;
  const id = idCheck.id;

  const { data: existing, error: fetchError } = await ctx.supabase
    .from("vendors")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("DELETE /api/vendors/[id] select:", fetchError);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    await deleteVendor(ctx.supabase, id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/vendors/[id]:", e);
    return NextResponse.json(
      { error: "Failed to delete vendor." },
      { status: 500 }
    );
  }
}
