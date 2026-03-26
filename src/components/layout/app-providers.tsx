"use client";

import { QueryProvider } from "@/components/providers/query-provider";
import { AppRoleProvider } from "@/contexts/app-role-context";

/** Minimal client root: global caches + role. Keeps hydration limited to provider context. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AppRoleProvider>{children}</AppRoleProvider>
    </QueryProvider>
  );
}
