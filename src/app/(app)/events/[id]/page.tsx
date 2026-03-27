import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getEvent,
  getChecklistItems,
  getEventDocuments,
  getEventComments,
  getEventMedia,
  getEventBudgetSummariesForMonth,
} from "@/lib/events";
import { eventDateToYearMonth } from "@/lib/budgets";
import { getActiveEventVendors } from "@/lib/vendors";
import type { Event, EventVendorWithVendor } from "@/types/database";
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

  const budgetMonth = eventDateToYearMonth(initialEvent.date);

  const [
    initialChecklist,
    initialDocuments,
    initialComments,
    initialMedia,
    initialEventVendors,
    initialBudgetPeers,
  ] = await Promise.all([
    getChecklistItems(supabase, id),
    getEventDocuments(supabase, id),
    getEventComments(supabase, id),
    getEventMedia(supabase, id),
    getActiveEventVendors(supabase, id).catch(
      () => [] as EventVendorWithVendor[]
    ),
    getEventBudgetSummariesForMonth(supabase, budgetMonth).catch(() => []),
  ]);

  const eventDetailClientKey = eventDetailBundleFingerprint({
    event: initialEvent,
    checklist: initialChecklist,
    documents: initialDocuments,
    comments: initialComments,
    media: initialMedia,
    eventVendors: initialEventVendors,
    budgetPeers: initialBudgetPeers,
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
      initialEventVendors={initialEventVendors}
      initialBudgetPeers={initialBudgetPeers}
    />
  );
}
