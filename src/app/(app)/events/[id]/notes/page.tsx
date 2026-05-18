import { notFound } from "next/navigation";
import { getCachedOrganizationSession } from "@/lib/app-organization-session";
import { getEvent } from "@/lib/events";
import type { Event } from "@/types/database";
import { EventNotesClient } from "./event-notes-client";

export default async function EventNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, sessionOrgId } = await getCachedOrganizationSession();

  let initialEvent: Event;
  try {
    initialEvent = await getEvent(supabase, id, sessionOrgId);
  } catch {
    notFound();
  }

  return (
    <EventNotesClient
      key={`${id}:${initialEvent.updated_at}:${initialEvent.planning_notes ?? ""}`}
      initialEvent={initialEvent}
    />
  );
}
