import { AppProviders } from "@/components/layout/app-providers";
import { AppChrome } from "@/components/layout/app-chrome";
import { createClient } from "@/lib/supabase/server";
import { getSessionOrganizationId } from "@/lib/organization-server";
import {
  listOrganizationsForUser,
} from "@/lib/organization";
import { getUserRole } from "@/lib/roles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const memberships = user
    ? await listOrganizationsForUser(supabase, user.id)
    : [];
  const sessionOrgId = await getSessionOrganizationId(supabase);
  const currentOrganization =
    sessionOrgId != null
      ? memberships.find((o) => o.id === sessionOrgId) ?? null
      : null;

  const role =
    user && sessionOrgId != null
      ? await getUserRole(supabase, user.id, sessionOrgId)
      : null;
  const userEmail = user?.email ?? null;

  return (
    <div className="min-h-screen bg-harley-black">
      <AppProviders
        role={role}
        currentOrganization={currentOrganization}
        memberships={memberships}
      >
        <AppChrome userEmail={userEmail}>{children}</AppChrome>
      </AppProviders>
    </div>
  );
}
