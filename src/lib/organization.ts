import { SupabaseClient } from "@supabase/supabase-js";
import { Organization } from "@/types/database";
import {
  listOrganizationIdsForUser,
  pickResolvedOrganizationId,
} from "@/lib/organization-scope";

/**
 * Active organization for this Supabase client session.
 * @param preferredOrganizationId — optional cookie hint on the server (`readOrganizationSelectionCookie`); omit on the client to use the first membership.
 */
export async function getCurrentOrganizationId(
  supabase: SupabaseClient,
  preferredOrganizationId?: string | null
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const memberIds = await listOrganizationIdsForUser(supabase, user.id);
  return pickResolvedOrganizationId(memberIds, preferredOrganizationId);
}

export async function listOrganizationsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<Organization[]> {
  const ids = await listOrganizationIdsForUser(supabase, userId);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .in("id", ids);

  if (error) throw error;
  const rows = (data ?? []) as Organization[];
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  );
}

export async function getCurrentOrganization(
  supabase: SupabaseClient,
  organizationId?: string | null
): Promise<Organization | null> {
  const orgId =
    organizationId != null
      ? organizationId
      : await getCurrentOrganizationId(supabase);
  if (!orgId) return null;

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) throw error;
  return data as Organization;
}

/** Adds a user to a specific organization (callers must enforce permissions; RLS). */
export async function addMemberToOrganization(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<void> {
  const { error } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: userId,
  });

  if (error) throw error;
}

/** Adds a user to the active organization for this client (see getCurrentOrganizationId). */
export async function addMemberToCurrentOrganization(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const orgId = await getCurrentOrganizationId(supabase);
  if (!orgId) throw new Error("No organization");
  await addMemberToOrganization(supabase, userId, orgId);
}
