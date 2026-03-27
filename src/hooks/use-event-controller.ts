"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateEvent, deleteEvent } from "@/lib/events";
import {
  useEventDetailData,
  type EventDetailServerBundle,
} from "@/hooks/use-event-detail-data";
import { useAppRole } from "@/contexts/app-role-context";
import { isEventAtRisk } from "@/lib/at-risk";
import type { EventStatus, EventType } from "@/types/database";

export function useEventController(
  eventId: string,
  initial: EventDetailServerBundle
) {
  const router = useRouter();
  const { canManageEvents, isAdmin } = useAppRole();
  const supabaseRef = useRef(
    typeof window !== "undefined" ? getSupabaseBrowserClient() : null
  );

  const {
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
  } = useEventDetailData(eventId, initial);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showStatusPills, setShowStatusPills] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (event?.is_live_mode) {
      root.classList.add("event-live-shell");
    } else {
      root.classList.remove("event-live-shell");
    }
    return () => root.classList.remove("event-live-shell");
  }, [event?.is_live_mode]);

  const allChecklistComplete = useMemo(
    () => checklist.length > 0 && checklist.every((item) => item.is_checked),
    [checklist]
  );

  const atRisk = useMemo(() => {
    if (!event) return false;
    const completed = checklist.filter((i) => i.is_checked).length;
    return isEventAtRisk(event.date, event.status, checklist.length, completed);
  }, [event, checklist]);

  const isLiveMode = event?.is_live_mode ?? false;

  const completedCount = checklist.filter((i) => i.is_checked).length;
  const totalCount = checklist.length;
  const percentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const onChecklistInvalidate = useCallback(
    () => void refetch.checklist(),
    [refetch]
  );

  const handleToggleLiveMode = useCallback(async () => {
    if (!event || !supabaseRef.current) return;
    const updated = await updateEvent(supabaseRef.current, event.id, {
      is_live_mode: !event.is_live_mode,
    });
    setEvent(updated);
  }, [event, setEvent]);

  const handleStatusChange = useCallback(
    async (newStatus: EventStatus) => {
      if (!event || !supabaseRef.current) return;
      const updated = await updateEvent(supabaseRef.current, event.id, {
        status: newStatus,
      });
      setEvent(updated);
    },
    [event, setEvent]
  );

  const handleEditSubmit = useCallback(
    async (data: {
      name: string;
      date: string;
      location: string;
      owner: string;
      status: string;
      description: string;
      onedrive_link: string;
      event_type: EventType | null;
      planned_budget: number | null;
      actual_budget: number | null;
    }) => {
      if (!event || !supabaseRef.current) return;
      const updated = await updateEvent(supabaseRef.current, event.id, {
        ...data,
        status: data.status as EventStatus,
        onedrive_link: data.onedrive_link || null,
        event_type: data.event_type,
        planned_budget: data.planned_budget,
        actual_budget: data.actual_budget,
      });
      setEditModalOpen(false);
      setEvent(updated);
      void refetch.orgEventsActive();
    },
    [event, setEvent, refetch]
  );

  const handleDelete = useCallback(async () => {
    if (!event || !supabaseRef.current) return;
    if (
      !confirm(
        "Are you sure you want to delete this event? This cannot be undone."
      )
    )
      return;
    await deleteEvent(supabaseRef.current, event.id);
    router.push("/dashboard");
  }, [event, router]);

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
    canManageEvents,
    isAdmin,
    editModalOpen,
    setEditModalOpen,
    showStatusPills,
    setShowStatusPills,
    allChecklistComplete,
    atRisk,
    isLiveMode,
    completedCount,
    totalCount,
    percentage,
    onChecklistInvalidate,
    handleToggleLiveMode,
    handleStatusChange,
    handleEditSubmit,
    handleDelete,
  };
}
