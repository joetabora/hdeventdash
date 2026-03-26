import { NextResponse } from "next/server";
import { getOrgAdminContext } from "@/lib/admin/require-org-admin";
import { setUserRole, deleteUserRole } from "@/lib/roles";
import type { UserRole } from "@/types/database";

const ROLES: UserRole[] = ["staff", "manager", "admin"];

type RouteContext = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const ctx = await getOrgAdminContext();
  if (!ctx.ok) return ctx.response;

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }
  if (userId === ctx.user.id) {
    return NextResponse.json(
      { error: "Cannot change your own role." },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role =
    typeof body === "object" &&
    body !== null &&
    "role" in body &&
    typeof (body as { role: unknown }).role === "string"
      ? ((body as { role: string }).role as UserRole)
      : null;

  if (!role || !ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  try {
    await setUserRole(ctx.supabase, userId, role);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to update role";
    console.error("PATCH role:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const ctx = await getOrgAdminContext();
  if (!ctx.ok) return ctx.response;

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }
  if (userId === ctx.user.id) {
    return NextResponse.json(
      { error: "Cannot remove your own role." },
      { status: 400 }
    );
  }

  try {
    await deleteUserRole(ctx.supabase, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to remove role";
    console.error("DELETE role:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
