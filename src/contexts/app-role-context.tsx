"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getUserRole,
  canManageEventsRole,
  isStaffOnlyRole,
} from "@/lib/roles";
import type { UserRole } from "@/types/database";

export interface AppRoleContextValue {
  role: UserRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  canManageEvents: boolean;
  isAdmin: boolean;
  isStaffOnly: boolean;
}

const AppRoleContext = createContext<AppRoleContextValue | null>(null);

export function AppRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    const r = await getUserRole(supabase, user.id);
    setRole(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<AppRoleContextValue>(
    () => ({
      role,
      loading,
      refresh,
      canManageEvents: canManageEventsRole(role),
      isAdmin: role === "admin",
      isStaffOnly: isStaffOnlyRole(role),
    }),
    [role, loading, refresh]
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
