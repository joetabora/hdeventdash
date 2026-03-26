import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";
import { getAllUserRoles } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ManagedUserDto {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

/** Org-scoped member list with roles; enriches emails via Auth Admin when service role is configured. */
export async function listManagedUsersForAdmin(
  supabase: SupabaseClient
): Promise<ManagedUserDto[]> {
  const roles = await getAllUserRoles(supabase);
  const { data: memberRows, error: membersError } = await supabase
    .from("organization_members")
    .select("user_id");
  if (membersError) throw membersError;

  const memberIds = new Set(
    (memberRows ?? []).map((m: { user_id: string }) => m.user_id)
  );

  const authById = new Map<string, { email: string; created_at: string }>();
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

  return Array.from(memberIds).map((userId) => {
    const auth = authById.get(userId);
    const roleRecord = roles.find((r) => r.user_id === userId);
    return {
      id: userId,
      email: auth?.email ?? `${userId.slice(0, 8)}…`,
      role: (roleRecord?.role as UserRole) ?? "staff",
      created_at: auth?.created_at ?? roleRecord?.created_at ?? "",
    };
  });
}
