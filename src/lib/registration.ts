import type { EventRegistration } from "@/types/database";

/** URL-safe slug from an event name plus a short random suffix. */
export function generateEventSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : suffix;
}

export function buildPublicEventPath(slug: string): string {
  return `/e/${encodeURIComponent(slug)}`;
}

/** Sum of party sizes for non-cancelled registrations. */
export function totalReservedSpots(rows: EventRegistration[]): number {
  return rows.reduce(
    (sum, r) => (r.status === "cancelled" ? sum : sum + r.party_size),
    0
  );
}

/** Sum of party sizes for checked-in registrations. */
export function totalCheckedIn(rows: EventRegistration[]): number {
  return rows.reduce(
    (sum, r) => (r.status === "checked_in" ? sum + r.party_size : sum),
    0
  );
}

export function spotsRemaining(
  capacity: number | null | undefined,
  reserved: number
): number | null {
  if (capacity == null) return null;
  return Math.max(capacity - reserved, 0);
}
