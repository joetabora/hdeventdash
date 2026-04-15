"use client";

/**
 * Client refetch for event detail: vendor links and monthly budget peers use API routes
 * (`/api/events/[eventId]/vendors`, `/api/events/[eventId]/budget-context`) so the browser
 * never runs org-wide vendor/event queries. Other slices still use scoped Supabase reads.
 */
import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getEvent,
  getChecklistItems,
  getEventDocuments,
  getEventComments,
  getEventMedia,
} from "@/lib/events";
import { apiFetchJson } from "@/lib/api/api-fetch-json";
import { apiFetchSwapMeetSpots } from "@/lib/events-api-client";
import type { EventBudgetPeer } from "@/lib/budgets";
import type {
  Event,
  ChecklistItem,
  EventDocument,
  EventComment,
  EventMedia,
  EventVendorWithVendor,
  MonthlyBudget,
  SwapMeetSpot,
} from "@/types/database";

export type EventDetailServerBundle = {
  event: Event;
  checklist: ChecklistItem[];
  documents: EventDocument[];
  comments: EventComment[];
  media: EventMedia[];
  eventVendors: EventVendorWithVendor[];
  budgetPeers: EventBudgetPeer[];
  monthlyBudgetsForEventMonth: MonthlyBudget[];
  swapMeetSpots: SwapMeetSpot[];
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
  const [monthlyBudgetsForEventMonth, setMonthlyBudgetsForEventMonth] =
    useState(initial.monthlyBudgetsForEventMonth);
  const [swapMeetSpots, setSwapMeetSpots] = useState(initial.swapMeetSpots);

  const localPatch = useMemo(
    () => ({
      checklistItem: (itemId: string, updates: Partial<ChecklistItem>) => {
        setChecklist((prev) =>
          prev.map((c) => (c.id === itemId ? { ...c, ...updates } : c))
        );
      },
      eventVendor: (linkId: string, updates: Partial<EventVendorWithVendor>) => {
        setEventVendors((prev) =>
          prev.map((v) => (v.id === linkId ? { ...v, ...updates } : v))
        );
      },
      addEventVendor: (vendor: EventVendorWithVendor) => {
        setEventVendors((prev) => [...prev, vendor]);
      },
      removeEventVendor: (linkId: string) => {
        setEventVendors((prev) => prev.filter((v) => v.id !== linkId));
      },
      swapMeetSpot: (spotId: string, updates: Partial<SwapMeetSpot>) => {
        setSwapMeetSpots((prev) =>
          prev.map((s) => (s.id === spotId ? { ...s, ...updates } : s))
        );
      },
      addSwapMeetSpot: (spot: SwapMeetSpot) => {
        setSwapMeetSpots((prev) => [...prev, spot]);
      },
      removeSwapMeetSpot: (spotId: string) => {
        setSwapMeetSpots((prev) => prev.filter((s) => s.id !== spotId));
      },
    }),
    []
  );

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
          const data = await apiFetchJson<{
            eventVendors: EventVendorWithVendor[];
          }>(`/api/events/${eventId}/vendors`);
          setEventVendors(data.eventVendors);
        } catch {
          setEventVendors([]);
        }
      },
      budgetContextForMonth: async (yearMonth: string) => {
        try {
          const data = await apiFetchJson<{
            events: EventBudgetPeer[];
            monthlyBudgets: MonthlyBudget[];
          }>(
            `/api/events/${eventId}/budget-context?month=${encodeURIComponent(yearMonth)}`
          );
          setBudgetPeers(data.events);
          setMonthlyBudgetsForEventMonth(data.monthlyBudgets ?? []);
        } catch {
          setBudgetPeers([]);
          setMonthlyBudgetsForEventMonth([]);
        }
      },
      swapMeetSpots: async () => {
        try {
          setSwapMeetSpots(await apiFetchSwapMeetSpots(eventId));
        } catch {
          setSwapMeetSpots([]);
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
    monthlyBudgetsForEventMonth,
    swapMeetSpots,
    localPatch,
    refetch,
  };
}
