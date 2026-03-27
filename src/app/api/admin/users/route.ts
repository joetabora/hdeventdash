import { NextResponse } from "next/server";
import { getOrgAdminContext } from "@/lib/admin/require-org-admin";
import { listManagedUsersForAdmin } from "@/lib/admin/managed-users";
import { setUserRole } from "@/lib/roles";
import { addMemberToOrganization } from "@/lib/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminCreateUserSchema } from "@/lib/validation/api-schemas";
import { parseWithSchema, readJsonBody } from "@/lib/validation/request-json";

export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx.ok) return ctx.response;

  const { supabase, user } = ctx;

  try {
    const users = await listManagedUsersForAdmin(supabase, ctx.organizationId);
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

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(adminCreateUserSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  const { email, password, role } = parsed.data;

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
    await addMemberToOrganization(ctx.supabase, newId, ctx.organizationId);
    await setUserRole(ctx.supabase, newId, role, ctx.organizationId);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to assign organization or role";
    await admin.auth.admin.deleteUser(newId);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId: newId });
}
