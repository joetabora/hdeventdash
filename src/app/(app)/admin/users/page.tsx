import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/roles";
import {
  listManagedUsersForAdmin,
  type ManagedUserDto,
} from "@/lib/admin/managed-users";
import { UserManagementClient } from "./user-management-client";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <UserManagementClient
        initialAuthorized={false}
        initialUsers={[]}
        initialCurrentUserId={null}
      />
    );
  }

  const allowed = await isAdmin(supabase, user.id);
  if (!allowed) {
    return (
      <UserManagementClient
        initialAuthorized={false}
        initialUsers={[]}
        initialCurrentUserId={null}
      />
    );
  }

  let initialUsers: ManagedUserDto[];
  try {
    initialUsers = await listManagedUsersForAdmin(supabase);
  } catch (e) {
    console.error("Admin users list:", e);
    initialUsers = [];
  }

  return (
    <UserManagementClient
      initialAuthorized={true}
      initialUsers={initialUsers}
      initialCurrentUserId={user.id}
    />
  );
}
