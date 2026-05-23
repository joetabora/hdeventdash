import { notFound } from "next/navigation";

import { getCachedOrganizationSession } from "@/lib/app-organization-session";
import {
  getEvent,
  getChecklistItems,
  getEventDocuments,
  getEventMedia,
  getSwapMeetSpots,
} from "@/lib/events";
import { getActiveEventVendors } from "@/lib/vendors";
import type { Event, EventVendorWithVendor } from "@/types/database";
import { EventReportClient } from "./event-report-client";

export default async function EventReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, sessionOrgId, memberships } =
    await getCachedOrganizationSession();

  let initialEvent: Event;
  try {
    initialEvent = await getEvent(supabase, id, sessionOrgId);
  } catch {
    notFound();
  }

  const [
    initialChecklist,
    initialDocuments,
    initialMedia,
    initialEventVendors,
    initialSwapMeetSpots,
  ] = await Promise.all([
    getChecklistItems(supabase, id),
    getEventDocuments(supabase, id),
    getEventMedia(supabase, id),
    getActiveEventVendors(supabase, id).catch(
      () => [] as EventVendorWithVendor[]
    ),
    getSwapMeetSpots(supabase, id).catch(() => []),
  ]);

  const org =
    memberships.find((m) => m.id === initialEvent.organization_id) ?? null;

  return (
    <EventReportClient
      event={initialEvent}
      checklist={initialChecklist}
      documents={initialDocuments}
      media={initialMedia}
      eventVendors={initialEventVendors}
      swapMeetSpots={initialSwapMeetSpots}
      organizationName={org?.name ?? null}
    />
  );
}
