import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVE_ORG_USER_METADATA_KEY } from "@/lib/active-organization";
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
 * Resolves the active organization for this request:
 * HttpOnly cookie is preferred over JWT `active_organization_id` so dealership switch
 * wins immediately; Postgres RLS still keys off JWT until the browser refreshSession runs.
 */
export async function getSessionOrganizationId(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const fromJwtRaw = user?.user_metadata?.[ACTIVE_ORG_USER_METADATA_KEY];
  const fromJwt =
    typeof fromJwtRaw === "string" &&
    isValidOrganizationIdCookieValue(fromJwtRaw)
      ? fromJwtRaw.trim()
      : undefined;

  const fromCookie = await readOrganizationSelectionCookie();

  /** Prefer HttpOnly org cookie (set on dealership switch) over JWT metadata, which may lag until refreshSession. */
  const preferred = fromCookie ?? fromJwt ?? undefined;

  return getCurrentOrganizationId(supabase, preferred);
}

/**
 * Persists org selection after the caller has verified membership (e.g. Server Action).
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
