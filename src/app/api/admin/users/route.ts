import { NextResponse } from "next/server";
import { getOrgAdminContext } from "@/lib/admin/require-org-admin";
import { listManagedUsersForAdmin } from "@/lib/admin/managed-users";
import { setUserRole } from "@/lib/roles";
import { addMemberToCurrentOrganization } from "@/lib/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

const ROLES: UserRole[] = ["staff", "manager", "admin"];

export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx.ok) return ctx.response;

  const { supabase, user } = ctx;

  try {
    const users = await listManagedUsersForAdmin(supabase);
    return NextResponse.json({
      users,
      currentUserId: user.id,
    });
  } catch (e) {
    console.error("GET /api/admin/users:", e);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx.ok) return ctx.response;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "User provisioning requires SUPABASE_SERVICE_ROLE_KEY on the server.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";
  const password =
    typeof body === "object" &&
    body !== null &&
    "password" in body &&
    typeof (body as { password: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";
  const role =
    typeof body === "object" &&
    body !== null &&
    "role" in body &&
    typeof (body as { role: unknown }).role === "string"
      ? ((body as { role: string }).role as UserRole)
      : null;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }
  if (!role || !ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data.user) {
    return NextResponse.json(
      { error: "No user returned from auth." },
      { status: 500 }
    );
  }

  const newId = data.user.id;

  try {
    await addMemberToCurrentOrganization(ctx.supabase, newId);
    await setUserRole(ctx.supabase, newId, role);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to assign organization or role";
    await admin.auth.admin.deleteUser(newId);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId: newId });
}
