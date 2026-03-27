import { SupabaseClient } from "@supabase/supabase-js";
import { UserRole, UserRoleRecord } from "@/types/database";
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string,
  organizationId?: string | null
): Promise<UserRole | null> {
  let q = supabase.from("user_roles").select("role").eq("user_id", userId);
  if (organizationId != null) {
    q = q.eq("organization_id", organizationId);
  }
  const { data, error } = await q.maybeSingle();

  if (error) {
    console.error("getUserRole error:", error.message);
    return null;
  }

  return (data?.role as UserRole) ?? null;
}

export async function isAdmin(
  supabase: SupabaseClient,
  userId: string,
  organizationId?: string | null
): Promise<boolean> {
  const role = await getUserRole(supabase, userId, organizationId);
  return role === "admin";
}

/** Admin or manager: create/edit events, files, comments, checklist structure. */
export function canManageEventsRole(role: UserRole | null): boolean {
  return role === "admin" || role === "manager";
}

/** Staff and unknown: checklist progress only (in app + RLS). */
export function isStaffOnlyRole(role: UserRole | null): boolean {
  return role === "staff" || role === null;
}

export async function getAllUserRoles(
  supabase: SupabaseClient,
  organizationId?: string | null
): Promise<UserRoleRecord[]> {
  let q = supabase
    .from("user_roles")
    .select("*")
    .order("created_at", { ascending: true });
  if (organizationId != null) {
    q = q.eq("organization_id", organizationId);
  }
  const { data, error } = await q;

  if (error) throw error;
  return (data as UserRoleRecord[]) ?? [];
}

export async function setUserRole(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole,
  organizationId: string
): Promise<void> {
  const { error } = await supabase.from("user_roles").upsert(
    { user_id: userId, role, organization_id: organizationId },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}

export async function deleteUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}
