"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useEventDetailData,
  type EventDetailServerBundle,
} from "@/hooks/use-event-detail-data";
import { useAppRole } from "@/contexts/app-role-context";
import { isEventAtRisk } from "@/lib/at-risk";
import {
  eventDateToYearMonth,
  effectiveMonthlyCapForEvent,
  sumMonthlyBudgetRows,
  sumOthersPlannedForMonth,
  sumChecklistEstimatedCost,
} from "@/lib/budgets";
import { normalizeLocationKey } from "@/lib/location-key";
import {
  apiDeleteEvent,
  apiPatchEvent,
} from "@/lib/events-api-client";
import type { EventStatus, EventType } from "@/types/database";

export function useEventController(
  eventId: string,
  initial: EventDetailServerBundle
) {
  const router = useRouter();
  const { canManageEvents, isAdmin } = useAppRole();

  const {
    event,
    setEvent,
    checklist,
    documents,
    comments,
    media,
    budgetPeers,
    monthlyBudgetsForEventMonth,
    eventVendors,
    refetch,
  } = useEventDetailData(eventId, initial);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showStatusPills, setShowStatusPills] = useState(false);

  const eventMonthYearMonth = useMemo(() => {
    if (!event?.date || event.date.length < 7) return null;
    return eventDateToYearMonth(event.date);
  }, [event]);

  const checklistEstimatedTotal = useMemo(
    () => sumChecklistEstimatedCost(checklist),
    [checklist]
  );

  const onBudgetContextInvalidate = useCallback(() => {
    if (eventMonthYearMonth) void refetch.budgetContextForMonth(eventMonthYearMonth);
  }, [eventMonthYearMonth, refetch]);

  const budgetSummaryForEventMonth = useMemo(() => {
    if (!event || !canManageEvents || !eventMonthYearMonth) return null;
    const key =
      (event.location_key && event.location_key.trim()) ||
      normalizeLocationKey(event.location?.trim() ?? "");
    const cap = effectiveMonthlyCapForEvent(monthlyBudgetsForEventMonth, key);
    const monthTotalCap = sumMonthlyBudgetRows(monthlyBudgetsForEventMonth);
    const hasVenueCapMismatch =
      Boolean(key) && cap === 0 && monthTotalCap > 0;
    const singleVenueMonth = monthlyBudgetsForEventMonth.length === 1;
    const othersPlanned = sumOthersPlannedForMonth(
      budgetPeers,
      eventMonthYearMonth,
      singleVenueMonth ? "" : key,
      event.id
    );
    return {
      yearMonth: eventMonthYearMonth,
      cap,
      monthTotalCap,
      hasVenueCapMismatch,
      othersPlanned,
      locationLabel: event.location?.trim() ?? "",
    };
  }, [
    event,
    canManageEvents,
    eventMonthYearMonth,
    monthlyBudgetsForEventMonth,
    budgetPeers,
  ]);

  /** Refresh caps/peers after Budget page changes or client navigation (SSR bundle can be stale). */
  useEffect(() => {
    if (!eventMonthYearMonth) return;
    void refetch.budgetContextForMonth(eventMonthYearMonth);
  }, [eventId, eventMonthYearMonth, refetch]);

  useEffect(() => {
    if (!editModalOpen || !event || !eventMonthYearMonth) return;
    void refetch.budgetContextForMonth(eventMonthYearMonth);
  }, [editModalOpen, event, eventMonthYearMonth, refetch]);

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
    if (!event) return;
    const updated = await apiPatchEvent(event.id, {
      is_live_mode: !event.is_live_mode,
    });
    setEvent(updated);
  }, [event, setEvent]);

  const handleStatusChange = useCallback(
    async (newStatus: EventStatus) => {
      if (!event) return;
      const updated = await apiPatchEvent(event.id, { status: newStatus });
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
      if (!event) return;
      const updated = await apiPatchEvent(event.id, {
        ...data,
        status: data.status as EventStatus,
        onedrive_link: data.onedrive_link || null,
        event_type: data.event_type,
        planned_budget: data.planned_budget,
        actual_budget: data.actual_budget,
      });
      setEditModalOpen(false);
      setEvent(updated);
      void refetch.budgetContextForMonth(eventDateToYearMonth(updated.date));
    },
    [event, setEvent, refetch]
  );

  const handleDelete = useCallback(async () => {
    if (!event) return;
    if (
      !confirm(
        "Are you sure you want to delete this event? This cannot be undone."
      )
    )
      return;
    await apiDeleteEvent(event.id);
    router.push("/dashboard");
  }, [event, router]);

  return {
    event,
    setEvent,
    checklist,
    documents,
    comments,
    media,
    budgetPeers,
    monthlyBudgetsForEventMonth,
    eventVendors,
    refetch,
    eventMonthYearMonth,
    budgetSummaryForEventMonth,
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
    onBudgetContextInvalidate,
    checklistEstimatedTotal,
    handleToggleLiveMode,
    handleStatusChange,
    handleEditSubmit,
    handleDelete,
    onBudgetPeersMonthChange: (yearMonth: string) => {
      void refetch.budgetContextForMonth(yearMonth);
    },
  };
}
