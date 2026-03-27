import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getEvent,
  getEvents,
  getChecklistItems,
  getEventDocuments,
  getEventComments,
  getEventMedia,
} from "@/lib/events";
import { getVendors, getActiveEventVendors } from "@/lib/vendors";
import type { Event, Vendor, EventVendorWithVendor } from "@/types/database";
import { eventDetailBundleFingerprint } from "@/lib/event-detail-bundle-fingerprint";
import { EventDetailClient } from "./event-detail-client";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let initialEvent: Event;
  try {
    initialEvent = await getEvent(supabase, id);
  } catch {
    notFound();
  }

  const [
    initialChecklist,
    initialDocuments,
    initialComments,
    initialMedia,
    initialAllVendors,
    initialEventVendors,
    orgEvents,
  ] = await Promise.all([
    getChecklistItems(supabase, id),
    getEventDocuments(supabase, id),
    getEventComments(supabase, id),
    getEventMedia(supabase, id),
    getVendors(supabase).catch(() => [] as Vendor[]),
    getActiveEventVendors(supabase, id).catch(
      () => [] as EventVendorWithVendor[]
    ),
    getEvents(supabase).catch(() => [] as Event[]),
  ]);

  const initialAllEventsForBudget = orgEvents.filter((e) => !e.is_archived);

  const eventDetailClientKey = eventDetailBundleFingerprint({
    event: initialEvent,
    checklist: initialChecklist,
    documents: initialDocuments,
    comments: initialComments,
    media: initialMedia,
    allVendors: initialAllVendors,
    eventVendors: initialEventVendors,
    allEventsForBudget: initialAllEventsForBudget,
  });

  return (
    <EventDetailClient
      key={eventDetailClientKey}
      eventId={id}
      initialEvent={initialEvent}
      initialChecklist={initialChecklist}
      initialDocuments={initialDocuments}
      initialComments={initialComments}
      initialMedia={initialMedia}
      initialAllVendors={initialAllVendors}
      initialEventVendors={initialEventVendors}
      initialAllEventsForBudget={initialAllEventsForBudget}
    />
  );
}
