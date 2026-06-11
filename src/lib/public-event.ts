import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Safe subset of an event exposed on the public registration page.
 * Loaded with the service-role client (anon visitors have no Supabase
 * session), so only these fields ever leave the server.
 */
export type PublicEventView = {
  id: string;
  slug: string;
  name: string;
  date: string;
  location: string;
  description: string;
  event_time_start: string | null;
  event_time_end: string | null;
  registration_capacity: number | null;
  organization_name: string;
  /** Sum of party sizes for non-cancelled registrations. */
  spots_reserved: number;
};

export async function loadPublicEvent(
  slug: string
): Promise<PublicEventView | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const { data: event, error } = await admin
    .from("events")
    .select(
      "id, name, date, location, description, event_time_start, event_time_end, registration_capacity, public_slug, organization_id"
    )
    .eq("public_slug", normalized)
    .eq("registration_enabled", true)
    .eq("is_archived", false)
    .maybeSingle();

  if (error || !event) {
    if (error) console.error("loadPublicEvent:", error);
    return null;
  }

  const [{ data: org }, { data: regs }] = await Promise.all([
    admin
      .from("organizations")
      .select("name")
      .eq("id", event.organization_id)
      .maybeSingle(),
    admin
      .from("event_registrations")
      .select("party_size, status")
      .eq("event_id", event.id)
      .neq("status", "cancelled"),
  ]);

  const spotsReserved = (regs ?? []).reduce(
    (sum, r) => sum + (Number(r.party_size) || 0),
    0
  );

  return {
    id: event.id,
    slug: event.public_slug,
    name: event.name,
    date: event.date,
    location: event.location ?? "",
    description: event.description ?? "",
    event_time_start: event.event_time_start ?? null,
    event_time_end: event.event_time_end ?? null,
    registration_capacity: event.registration_capacity ?? null,
    organization_name: org?.name ?? "",
    spots_reserved: spotsReserved,
  };
}

/** Registration is open when the event date is today or in the future. */
export function isRegistrationOpen(eventDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return false;
  const today = new Date();
  const todayYmd = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return eventDate >= todayYmd;
}
