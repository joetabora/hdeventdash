import { getCachedOrganizationSession } from "@/lib/app-organization-session";
import { isAdmin } from "@/lib/roles";
import {
  listManagedUsersForAdmin,
  type ManagedUserDto,
} from "@/lib/admin/managed-users";
import { UserManagementClient } from "./user-management-client";

export default async function AdminUsersPage() {
  const { supabase, user, sessionOrgId: organizationId } =
    await getCachedOrganizationSession();

  const deniedKey = "admin-users:denied" as const;

  if (!user) {
    return (
      <UserManagementClient
        key={deniedKey}
        initialAuthorized={false}
        initialUsers={[]}
        initialCurrentUserId={null}
      />
    );
  }

  if (!organizationId) {
    return (
      <UserManagementClient
        key={deniedKey}
        initialAuthorized={false}
        initialUsers={[]}
        initialCurrentUserId={null}
      />
    );
  }

  const allowed = await isAdmin(supabase, user.id, organizationId);
  if (!allowed) {
    return (
      <UserManagementClient
        key={deniedKey}
        initialAuthorized={false}
        initialUsers={[]}
        initialCurrentUserId={null}
      />
    );
  }

  let initialUsers: ManagedUserDto[];
  try {
    initialUsers = await listManagedUsersForAdmin(supabase, organizationId);
  } catch (e) {
    console.error("Admin users list:", e);
    initialUsers = [];
  }

  const usersClientKey = [
    organizationId,
    ...initialUsers.map((u) => `${u.id}:${u.role}:${u.created_at}`),
  ].join("|");

  return (
    <UserManagementClient
      key={usersClientKey}
      initialAuthorized={true}
      initialUsers={initialUsers}
      initialCurrentUserId={user.id}
    />
  );
}
