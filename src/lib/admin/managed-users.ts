import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";
import { getAllUserRoles } from "@/lib/roles";

type AppUserJoinRow = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  raw_user_meta_data: Record<string, unknown> | null;
} | null;

function joinedAppUser(v: unknown): AppUserJoinRow {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const first = v[0];
    return first && typeof first === "object"
      ? (first as AppUserJoinRow)
      : null;
  }
  return v as AppUserJoinRow;
}

export interface ManagedUserDto {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  /** Mirrored from auth `raw_user_meta_data` (e.g. full_name). */
  raw_user_meta_data?: Record<string, unknown>;
}

/** Org-scoped member list with roles; reads identity from `app_users` (no Auth Admin listUsers). */
export async function listManagedUsersForAdmin(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ManagedUserDto[]> {
  const roles = await getAllUserRoles(supabase, organizationId);
  const { data: rows, error } = await supabase
    .from("organization_members")
    .select(
      "user_id, app_users ( id, email, created_at, updated_at, raw_user_meta_data )"
    )
    .eq("organization_id", organizationId);
  if (error) throw error;

  const list = (rows ?? []).map((row) => {
    const userId = row.user_id as string;
    const au = joinedAppUser(row.app_users);
    const roleRecord = roles.find((r) => r.user_id === userId);
    const meta = au?.raw_user_meta_data;
    const dto: ManagedUserDto = {
      id: userId,
      email: (au?.email ?? "").trim() || `${userId.slice(0, 8)}…`,
      role: (roleRecord?.role as UserRole) ?? "staff",
      created_at: au?.created_at ?? roleRecord?.created_at ?? "",
    };
    if (meta && typeof meta === "object" && !Array.isArray(meta)) {
      dto.raw_user_meta_data = meta as Record<string, unknown>;
    }
    return dto;
  });

  list.sort((a, b) => a.email.localeCompare(b.email));
  return list;
}
