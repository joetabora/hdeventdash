import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { updateVendor, deleteVendor } from "@/lib/vendors";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const updates: Parameters<typeof updateVendor>[2] = {};
  if (typeof b.name === "string") updates.name = b.name.trim();
  if (typeof b.contact_name === "string") updates.contact_name = b.contact_name;
  if (typeof b.email === "string") updates.email = b.email;
  if (typeof b.phone === "string") updates.phone = b.phone;
  if (typeof b.website === "string") updates.website = b.website;
  if (typeof b.category === "string") updates.category = b.category;
  if (typeof b.notes === "string") updates.notes = b.notes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }
  if (updates.name !== undefined && !updates.name) {
    return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
  }

  try {
    const vendor = await updateVendor(ctx.supabase, id, updates);
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

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

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
