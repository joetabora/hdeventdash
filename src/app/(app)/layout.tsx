import { AppProviders } from "@/components/layout/app-providers";
import { AppChrome } from "@/components/layout/app-chrome";
import { getCachedOrganizationSession } from "@/lib/app-organization-session";
import { getUserRole } from "@/lib/roles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
  const userEmail = user?.email ?? null;

  return (
    <div className="min-h-screen bg-harley-black">
      <AppProviders
        role={role}
        currentOrganization={currentOrganization}
        memberships={memberships}
      >
        <AppChrome userEmail={userEmail} activeOrganizationId={sessionOrgId}>
          {children}
        </AppChrome>
      </AppProviders>
    </div>
  );
}
