"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getEvent,
  getChecklistItems,
  getEventDocuments,
  getEventComments,
  getEventMedia,
} from "@/lib/events";
import { getActiveEventVendors } from "@/lib/vendors";
import { apiFetchJson } from "@/lib/api/api-fetch-json";
import type { EventBudgetPeer } from "@/lib/budgets";
import type {
  Event,
  ChecklistItem,
  EventDocument,
  EventComment,
  EventMedia,
  EventVendorWithVendor,
} from "@/types/database";

export type EventDetailServerBundle = {
  event: Event;
  checklist: ChecklistItem[];
  documents: EventDocument[];
  comments: EventComment[];
  media: EventMedia[];
  eventVendors: EventVendorWithVendor[];
  budgetPeers: EventBudgetPeer[];
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
  const [eventVendors, setEventVendors] = useState(initial.eventVendors);
  const [budgetPeers, setBudgetPeers] = useState(initial.budgetPeers);

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
      budgetPeersForMonth: async (yearMonth: string) => {
        try {
          const data = await apiFetchJson<{ events: EventBudgetPeer[] }>(
            `/api/events/budget-context?month=${encodeURIComponent(yearMonth)}`
          );
          setBudgetPeers(data.events);
        } catch {
          setBudgetPeers([]);
        }
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
    eventVendors,
    budgetPeers,
    refetch,
  };
}
