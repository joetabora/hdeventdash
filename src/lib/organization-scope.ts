import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * HttpOnly cookie: SSR hint for dealership selection alongside JWT
 * `user_metadata.active_organization_id` (preferred for RLS alignment).
 *
 * Allows multiple memberships per user (`organization_members`).
 */
export const ORGANIZATION_SELECTION_COOKIE_NAME = "hd_current_org_id";

/** UUID v4 pattern (loose) for cookie validation. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidOrganizationIdCookieValue(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * All organizations the user belongs to, oldest membership first.
 * Callers should not assume a single row; use `pickResolvedOrganizationId`.
 */
export async function listOrganizationIdsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => row.organization_id as string);
}

/**
 * Resolves which org is "current": prefer an explicit selection when it is a
 * valid membership; otherwise the first membership (deterministic order).
 */
export function pickResolvedOrganizationId(
  memberOrganizationIds: string[],
  preferredOrganizationId?: string | null
): string | null {
  if (memberOrganizationIds.length === 0) return null;
  const preferred = preferredOrganizationId?.trim();
  if (
    preferred &&
    memberOrganizationIds.includes(preferred)
  ) {
    return preferred;
  }
  return memberOrganizationIds[0] ?? null;
}
