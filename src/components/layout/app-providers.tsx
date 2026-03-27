"use client";

import { AppRoleProvider } from "@/contexts/app-role-context";
import type { UserRole } from "@/types/database";

/** Client root: role from RSC layout (no client auth bootstrap on mount). */
export function AppProviders({
  children,
  role,
}: {
  children: React.ReactNode;
  role: UserRole | null;
}) {
  return <AppRoleProvider role={role}>{children}</AppRoleProvider>;
}
