"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Organization } from "@/types/database";

export type CurrentOrganizationContextValue = {
  /** Active organization for this session (server-resolved cookie + membership). */
  currentOrganization: Organization | null;
  /** Organizations the signed-in user belongs to (Milwaukee + West Bend, etc.). */
  memberships: Organization[];
};

const CurrentOrganizationContext =
  createContext<CurrentOrganizationContextValue | null>(null);

export function CurrentOrganizationProvider({
  currentOrganization,
  memberships,
  children,
}: {
  currentOrganization: Organization | null;
  memberships: Organization[];
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ currentOrganization, memberships }),
    [currentOrganization, memberships]
  );

  return (
    <CurrentOrganizationContext.Provider value={value}>
      {children}
    </CurrentOrganizationContext.Provider>
  );
}

export function useCurrentOrganization(): CurrentOrganizationContextValue {
  const ctx = useContext(CurrentOrganizationContext);
  if (!ctx) {
    throw new Error(
      "useCurrentOrganization must be used within CurrentOrganizationProvider"
    );
  }
  return ctx;
}
