import { getCachedOrganizationSession } from "@/lib/app-organization-session";
import { getUserRole } from "@/lib/roles";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user, sessionOrgId, memberships } =
    await getCachedOrganizationSession();

  const currentOrganization =
    sessionOrgId != null
      ? memberships.find((o) => o.id === sessionOrgId) ?? null
      : null;

  const role =
    user && sessionOrgId != null
      ? await getUserRole(supabase, user.id, sessionOrgId)
      : null;

  return (
    <SettingsClient
      userEmail={user?.email ?? null}
      role={role}
      organization={currentOrganization}
    />
  );
}
