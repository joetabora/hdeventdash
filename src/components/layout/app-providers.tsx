"use client";

import { AppRoleProvider } from "@/contexts/app-role-context";

/** Minimal client root: role context. Keeps hydration limited to provider context. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AppRoleProvider>{children}</AppRoleProvider>;
}
