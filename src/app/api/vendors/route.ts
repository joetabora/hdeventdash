import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { createVendor } from "@/lib/vendors";

export async function POST(request: Request) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  try {
    const vendor = await createVendor(ctx.supabase, {
      name,
      contact_name: typeof b.contact_name === "string" ? b.contact_name : "",
      email: typeof b.email === "string" ? b.email : "",
      phone: typeof b.phone === "string" ? b.phone : "",
      website: typeof b.website === "string" ? b.website : "",
      category: typeof b.category === "string" ? b.category : "",
      notes: typeof b.notes === "string" ? b.notes : "",
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
