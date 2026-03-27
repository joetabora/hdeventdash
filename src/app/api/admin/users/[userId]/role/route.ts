import { NextResponse } from "next/server";
import { getOrgAdminContext } from "@/lib/admin/require-org-admin";
import { setUserRole, deleteUserRole } from "@/lib/roles";
import { adminRolePatchSchema } from "@/lib/validation/api-schemas";
import { parseUuidParam, parseWithSchema, readJsonBody } from "@/lib/validation/request-json";

type RouteContext = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const ctx = await getOrgAdminContext();
  if (!ctx.ok) return ctx.response;

  const { userId: rawUserId } = await context.params;
  const userIdCheck = parseUuidParam(rawUserId, "user id");
  if (!userIdCheck.ok) return userIdCheck.response;
  const userId = userIdCheck.id;
  if (userId === ctx.user.id) {
    return NextResponse.json(
      { error: "Cannot change your own role." },
      { status: 400 }
    );
  }

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(adminRolePatchSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    await setUserRole(ctx.supabase, userId, parsed.data.role, ctx.organizationId);
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

  const { userId: rawUserId } = await context.params;
  const userIdCheck = parseUuidParam(rawUserId, "user id");
  if (!userIdCheck.ok) return userIdCheck.response;
  const userId = userIdCheck.id;
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
