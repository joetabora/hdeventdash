"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { eventKeys } from "@/lib/query-keys";
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

export function useEventDetailQueries(
  eventId: string,
  initial: EventDetailServerBundle
) {
  const queryClient = useQueryClient();

  const eventQuery = useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => getEvent(createClient(), eventId),
    initialData: initial.event,
  });

  const checklistQuery = useQuery({
    queryKey: eventKeys.checklist(eventId),
    queryFn: () => getChecklistItems(createClient(), eventId),
    initialData: initial.checklist,
  });

  const documentsQuery = useQuery({
    queryKey: eventKeys.documents(eventId),
    queryFn: () => getEventDocuments(createClient(), eventId),
    initialData: initial.documents,
  });

  const commentsQuery = useQuery({
    queryKey: eventKeys.comments(eventId),
    queryFn: () => getEventComments(createClient(), eventId),
    initialData: initial.comments,
  });

  const mediaQuery = useQuery({
    queryKey: eventKeys.media(eventId),
    queryFn: () => getEventMedia(createClient(), eventId),
    initialData: initial.media,
  });

  const orgVendorsQuery = useQuery({
    queryKey: eventKeys.orgVendors(),
    queryFn: () => getVendors(createClient()),
    initialData: initial.allVendors,
  });

  const eventVendorsQuery = useQuery({
    queryKey: eventKeys.eventVendors(eventId),
    queryFn: () =>
      getActiveEventVendors(createClient(), eventId).catch(
        () => [] as EventVendorWithVendor[]
      ),
    initialData: initial.eventVendors,
  });

  const orgEventsQuery = useQuery({
    queryKey: eventKeys.orgEventsActive(),
    queryFn: async () => {
      const rows = await getEvents(createClient());
      return rows.filter((e) => !e.is_archived);
    },
    initialData: initial.allEventsForBudget,
  });

  const invalidate = useMemo(
    () => ({
      event: () =>
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
      checklist: () =>
        queryClient.invalidateQueries({ queryKey: eventKeys.checklist(eventId) }),
      documents: () =>
        queryClient.invalidateQueries({ queryKey: eventKeys.documents(eventId) }),
      comments: () =>
        queryClient.invalidateQueries({ queryKey: eventKeys.comments(eventId) }),
      media: () =>
        queryClient.invalidateQueries({ queryKey: eventKeys.media(eventId) }),
      eventVendors: () =>
        queryClient.invalidateQueries({
          queryKey: eventKeys.eventVendors(eventId),
        }),
      orgVendors: () =>
        queryClient.invalidateQueries({ queryKey: eventKeys.orgVendors() }),
      orgEventsActive: () =>
        queryClient.invalidateQueries({ queryKey: eventKeys.orgEventsActive() }),
    }),
    [eventId, queryClient]
  );

  return {
    queryClient,
    event: eventQuery.data,
    checklist: checklistQuery.data ?? [],
    documents: documentsQuery.data ?? [],
    comments: commentsQuery.data ?? [],
    media: mediaQuery.data ?? [],
    allVendors: orgVendorsQuery.data ?? [],
    eventVendors: eventVendorsQuery.data ?? [],
    allEventsForBudget: orgEventsQuery.data ?? [],
    invalidate,
  };
}
