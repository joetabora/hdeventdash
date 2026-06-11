import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrgAdminContext } from "@/lib/admin/require-org-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseWithSchema, readJsonBody } from "@/lib/validation/request-json";

const organizationPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    marketing_art_form_url: z
      .union([z.string().trim().url().max(2000), z.literal(""), z.null()])
      .optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: "No fields to update" });

/**
 * PATCH /api/organization — update the active org's settings (admin only).
 * Uses the service-role client because RLS has no UPDATE policy on
 * organizations; the admin check above is the authorization boundary and
 * the update is pinned to the caller's active organization id.
 */
export async function PATCH(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx.ok) return ctx.response;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(organizationPatchSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server is not configured for organization updates." },
      { status: 503 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.marketing_art_form_url !== undefined) {
    updates.marketing_art_form_url =
      parsed.data.marketing_art_form_url === ""
        ? null
        : parsed.data.marketing_art_form_url;
  }

  try {
    const { data, error } = await admin
      .from("organizations")
      .update(updates)
      .eq("id", ctx.organizationId)
      .select("id, name, marketing_art_form_url")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    console.error("PATCH /api/organization:", e);
    return NextResponse.json(
      { error: "Failed to update organization." },
      { status: 500 }
    );
  }
}
