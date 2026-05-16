"use client";

import { AppRoleProvider } from "@/contexts/app-role-context";
import { CurrentOrganizationProvider } from "@/contexts/current-organization-context";
import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import type { Organization, UserRole } from "@/types/database";

/** Client root: role and org scope from RSC layout (no client auth bootstrap on mount). */
export function AppProviders({
  children,
  role,
  currentOrganization,
  memberships,
}: {
  children: React.ReactNode;
  role: UserRole | null;
  currentOrganization: Organization | null;
  memberships: Organization[];
}) {
  return (
    <AppRoleProvider role={role}>
      <CurrentOrganizationProvider
        currentOrganization={currentOrganization}
        memberships={memberships}
      >
        <AuthSessionSync />
        {children}
      </CurrentOrganizationProvider>
    </AppRoleProvider>
  );
}
