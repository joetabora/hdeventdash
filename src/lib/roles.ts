import { SupabaseClient } from "@supabase/supabase-js";
import { UserRole, UserRoleRecord } from "@/types/database";

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole | null> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  return (data?.role as UserRole) ?? null;
}

export async function isAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const role = await getUserRole(supabase, userId);
  return role === "admin";
}

export async function getAllUserRoles(
  supabase: SupabaseClient
): Promise<UserRoleRecord[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as UserRoleRecord[]) ?? [];
}

export async function setUserRole(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole
): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id" });

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
