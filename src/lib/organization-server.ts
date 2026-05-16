import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ACTIVE_ORG_USER_METADATA_KEY } from "@/lib/active-organization";
import {
  ORGANIZATION_SELECTION_COOKIE_NAME,
  isValidOrganizationIdCookieValue,
  listOrganizationIdsForUser,
  pickResolvedOrganizationId,
} from "@/lib/organization-scope";
import type { Organization } from "@/types/database";

/**
 * Reads the optional org-selection cookie (Server Components, Route Handlers, Server Actions only).
 */
export async function readOrganizationSelectionCookie(): Promise<string | undefined> {
  const raw = (await cookies()).get(ORGANIZATION_SELECTION_COOKIE_NAME)?.value;
  if (!raw || !isValidOrganizationIdCookieValue(raw)) return undefined;
  return raw.trim();
}

/**
 * Single membership + org row load with one `listOrganizationIdsForUser` call
 * (replaces separate `getSessionOrganizationId` + `listOrganizationsForUser`).
 */
export async function loadAppOrganizationBootstrap(
  supabase: SupabaseClient,
  user: User
): Promise<{
  sessionOrgId: string | null;
  memberships: Organization[];
}> {
  const [fromCookie, memberIds] = await Promise.all([
    readOrganizationSelectionCookie(),
    listOrganizationIdsForUser(supabase, user.id),
  ]);

  const fromJwtRaw = user.user_metadata?.[ACTIVE_ORG_USER_METADATA_KEY];
  const fromJwt =
    typeof fromJwtRaw === "string" &&
    isValidOrganizationIdCookieValue(fromJwtRaw)
      ? fromJwtRaw.trim()
      : undefined;

  const preferred = fromCookie ?? fromJwt ?? undefined;
  const sessionOrgId = pickResolvedOrganizationId(memberIds, preferred);

  if (memberIds.length === 0) {
    return { sessionOrgId, memberships: [] };
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .in("id", memberIds);

  if (error) throw error;
  const rows = (data ?? []) as Organization[];
  const order = new Map(memberIds.map((id, i) => [id, i]));
  const memberships = rows.sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  );

  return { sessionOrgId, memberships };
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
  if (!user) return null;

  const { sessionOrgId } = await loadAppOrganizationBootstrap(supabase, user);
  return sessionOrgId;
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
