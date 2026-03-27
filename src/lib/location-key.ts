/**
 * Canonical key for matching events and monthly budgets by venue.
 * Must stay in sync with SQL `public.normalize_location_key`.
 */
export function normalizeLocationKey(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return "";
  const underscored = s.replace(/[^a-z0-9]+/g, "_");
  const trimmed = underscored.replace(/^_+|_+$/g, "");
  return trimmed.replace(/_+/g, "_");
}
