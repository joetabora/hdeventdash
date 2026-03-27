import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ORGANIZATION_SELECTION_COOKIE_NAME,
  isValidOrganizationIdCookieValue,
} from "@/lib/organization-scope";
import { getCurrentOrganizationId } from "@/lib/organization";

/**
 * Reads the optional org-selection cookie (Server Components, Route Handlers, Server Actions only).
 */
export async function readOrganizationSelectionCookie(): Promise<string | undefined> {
  const raw = (await cookies()).get(ORGANIZATION_SELECTION_COOKIE_NAME)?.value;
  if (!raw || !isValidOrganizationIdCookieValue(raw)) return undefined;
  return raw.trim();
}

/**
 * Resolves the active organization for this request (cookie + membership).
 * Use from server entrypoints (layout, API routes, RSC) instead of assuming a single membership row.
 */
export async function getSessionOrganizationId(
  supabase: SupabaseClient
): Promise<string | null> {
  const preferred = await readOrganizationSelectionCookie();
  return getCurrentOrganizationId(supabase, preferred);
}

/**
 * Persists org selection after the caller has verified membership (e.g. Server Action).
 * No-op safe: still subject to DB `UNIQUE(user_id)` until multi-membership is enabled.
 */
export async function setOrganizationSelectionCookie(
  organizationId: string
): Promise<void> {
  if (!isValidOrganizationIdCookieValue(organizationId)) {
    throw new Error("Invalid organization id");
  }
  (await cookies()).set(ORGANIZATION_SELECTION_COOKIE_NAME, organizationId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearOrganizationSelectionCookie(): Promise<void> {
  (await cookies()).delete(ORGANIZATION_SELECTION_COOKIE_NAME);
}
