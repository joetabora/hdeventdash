"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import {
  canManageEventsRole,
  isStaffOnlyRole,
} from "@/lib/roles";
import type { UserRole } from "@/types/database";

export interface AppRoleContextValue {
  role: UserRole | null;
  /** Always false: role comes from the server layout. */
  loading: boolean;
  /** Revalidates the server layout so role props update (e.g. after admin changes your role). */
  refresh: () => Promise<void>;
  canManageEvents: boolean;
  isAdmin: boolean;
  isStaffOnly: boolean;
}

const AppRoleContext = createContext<AppRoleContextValue | null>(null);

export function AppRoleProvider({
  role,
  children,
}: {
  role: UserRole | null;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const refresh = useCallback(async () => {
    router.refresh();
  }, [router]);

  const value = useMemo<AppRoleContextValue>(
    () => ({
      role,
      loading: false,
      refresh,
      canManageEvents: canManageEventsRole(role),
      isAdmin: role === "admin",
      isStaffOnly: isStaffOnlyRole(role),
    }),
    [role, refresh]
  );

  return (
    <AppRoleContext.Provider value={value}>{children}</AppRoleContext.Provider>
  );
}

export function useAppRole(): AppRoleContextValue {
  const ctx = useContext(AppRoleContext);
  if (!ctx) {
    throw new Error("useAppRole must be used within AppRoleProvider");
  }
  return ctx;
}
