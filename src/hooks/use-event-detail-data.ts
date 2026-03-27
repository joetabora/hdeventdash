"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getEvent,
  getChecklistItems,
  getEventDocuments,
  getEventComments,
  getEventMedia,
  getEvents,
} from "@/lib/events";
import { getVendors, getActiveEventVendors } from "@/lib/vendors";
import type {
  Event,
  ChecklistItem,
  EventDocument,
  EventComment,
  EventMedia,
  Vendor,
  EventVendorWithVendor,
} from "@/types/database";

export type EventDetailServerBundle = {
  event: Event;
  checklist: ChecklistItem[];
  documents: EventDocument[];
  comments: EventComment[];
  media: EventMedia[];
  allVendors: Vendor[];
  eventVendors: EventVendorWithVendor[];
  allEventsForBudget: Event[];
};

export function useEventDetailData(
  eventId: string,
  initial: EventDetailServerBundle
) {
  const [event, setEvent] = useState<Event | null>(initial.event);
  const [checklist, setChecklist] = useState(initial.checklist);
  const [documents, setDocuments] = useState(initial.documents);
  const [comments, setComments] = useState(initial.comments);
  const [media, setMedia] = useState(initial.media);
  const [allVendors, setAllVendors] = useState(initial.allVendors);
  const [eventVendors, setEventVendors] = useState(initial.eventVendors);
  const [allEventsForBudget, setAllEventsForBudget] = useState(
    initial.allEventsForBudget
  );

  /* eslint-disable react-hooks/set-state-in-effect -- mirror RSC bundle when eventId or server data changes */
  useLayoutEffect(() => {
    setEvent(initial.event);
    setChecklist(initial.checklist);
    setDocuments(initial.documents);
    setComments(initial.comments);
    setMedia(initial.media);
    setAllVendors(initial.allVendors);
    setEventVendors(initial.eventVendors);
    setAllEventsForBudget(initial.allEventsForBudget);
  }, [
    eventId,
    initial.event,
    initial.checklist,
    initial.documents,
    initial.comments,
    initial.media,
    initial.allVendors,
    initial.eventVendors,
    initial.allEventsForBudget,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const refetch = useMemo(
    () => ({
      event: async () => {
        const row = await getEvent(getSupabaseBrowserClient(), eventId);
        setEvent(row);
      },
      checklist: async () => {
        setChecklist(await getChecklistItems(getSupabaseBrowserClient(), eventId));
      },
      documents: async () => {
        setDocuments(await getEventDocuments(getSupabaseBrowserClient(), eventId));
      },
      comments: async () => {
        setComments(await getEventComments(getSupabaseBrowserClient(), eventId));
      },
      media: async () => {
        setMedia(await getEventMedia(getSupabaseBrowserClient(), eventId));
      },
      eventVendors: async () => {
        try {
          setEventVendors(
            await getActiveEventVendors(getSupabaseBrowserClient(), eventId)
          );
        } catch {
          setEventVendors([]);
        }
      },
      orgVendors: async () => {
        setAllVendors(await getVendors(getSupabaseBrowserClient()));
      },
      orgEventsActive: async () => {
        const rows = await getEvents(getSupabaseBrowserClient());
        setAllEventsForBudget(rows.filter((e) => !e.is_archived));
      },
    }),
    [eventId]
  );

  return {
    event,
    setEvent,
    checklist,
    documents,
    comments,
    media,
    allVendors,
    eventVendors,
    allEventsForBudget,
    refetch,
  };
}
