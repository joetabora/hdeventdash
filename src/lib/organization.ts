import { SupabaseClient } from "@supabase/supabase-js";
import { Organization } from "@/types/database";

export async function getCurrentOrganizationId(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.organization_id ?? null;
}

export async function getCurrentOrganization(
  supabase: SupabaseClient
): Promise<Organization | null> {
  const orgId = await getCurrentOrganizationId(supabase);
  if (!orgId) return null;

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) throw error;
  return data as Organization;
}

/** Adds a user to the signed-in admin’s organization (org admins only; RLS). */
export async function addMemberToCurrentOrganization(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const orgId = await getCurrentOrganizationId(supabase);
  if (!orgId) throw new Error("No organization");

  const { error } = await supabase.from("organization_members").insert({
    organization_id: orgId,
    user_id: userId,
  });

  if (error) throw error;
}
