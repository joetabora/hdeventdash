import { NextResponse } from "next/server";
import { getOrgAdminContext } from "@/lib/admin/require-org-admin";
import { getAllUserRoles, setUserRole } from "@/lib/roles";
import { addMemberToCurrentOrganization } from "@/lib/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

const ROLES: UserRole[] = ["staff", "manager", "admin"];

export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx.ok) return ctx.response;

  const { supabase, user } = ctx;

  try {
    const roles = await getAllUserRoles(supabase);
    const { data: memberRows, error: membersError } = await supabase
      .from("organization_members")
      .select("user_id");
    if (membersError) throw membersError;

    const memberIds = new Set(
      (memberRows ?? []).map((m: { user_id: string }) => m.user_id)
    );

    const authById = new Map<
      string,
      { email: string; created_at: string }
    >();

    const admin = createAdminClient();
    if (admin && memberIds.size > 0) {
      const found = new Set<string>();
      let page = 1;
      const perPage = 200;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({
          page,
          perPage,
        });
        if (error) throw error;
        for (const au of data.users) {
          if (memberIds.has(au.id)) {
            found.add(au.id);
            authById.set(au.id, {
              email: au.email ?? "unknown",
              created_at: au.created_at,
            });
          }
        }
        if (found.size >= memberIds.size || data.users.length < perPage) {
          break;
        }
        page += 1;
      }
    }

    const users = Array.from(memberIds).map((userId) => {
      const auth = authById.get(userId);
      const roleRecord = roles.find((r) => r.user_id === userId);
      return {
        id: userId,
        email: auth?.email ?? `${userId.slice(0, 8)}…`,
        role: (roleRecord?.role as UserRole) ?? "staff",
        created_at: auth?.created_at ?? roleRecord?.created_at ?? "",
      };
    });

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
