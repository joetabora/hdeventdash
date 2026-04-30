"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useEventDetailData,
  type EventDetailServerBundle,
} from "@/hooks/use-event-detail-data";
import { useAppRole } from "@/contexts/app-role-context";
import { isEventAtRiskByPlanning } from "@/lib/at-risk";
import { computePlaybookPlanningProgress } from "@/lib/playbook-planning-progress";
import {
  eventDateToYearMonth,
  effectiveMonthlyCapForEvent,
  sumMonthlyBudgetRows,
  sumOthersPlannedForMonth,
  sumChecklistEstimatedCost,
} from "@/lib/budgets";
import { sumPlaybookFrameworkCosts } from "@/lib/playbook-workflow";
import { normalizeLocationKey } from "@/lib/location-key";
import {
  apiDeleteEvent,
  apiPatchEvent,
} from "@/lib/events-api-client";
import type { EventStatus } from "@/types/database";
import { showError, errorMessage } from "@/lib/toast";

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
    swapMeetSpots,
    localPatch,
    refetch,
  } = useEventDetailData(eventId, initial);

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

  const vendorFeeTotal = useMemo(
    () => eventVendors.reduce((s, v) => s + (Number(v.agreed_fee) || 0), 0),
    [eventVendors]
  );

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
    const thisEventPlanned = Number(event.planned_budget) || 0;
    const checklistLineSpend = sumChecklistEstimatedCost(checklist);
    const playbookFrameworkSpend = sumPlaybookFrameworkCosts(
      event.playbook_workflow
    );
    const thisEventCommitted =
      thisEventPlanned +
      checklistLineSpend +
      vendorFeeTotal +
      playbookFrameworkSpend;
    const totalCommittedInMonth = othersPlanned + thisEventCommitted;
    const remaining =
      cap > 0 ? cap - totalCommittedInMonth : null;
    return {
      yearMonth: eventMonthYearMonth,
      cap,
      monthTotalCap,
      hasVenueCapMismatch,
      othersPlanned,
      locationLabel: event.location?.trim() ?? "",
      thisEventPlanned,
      checklistLineSpend,
      playbookFrameworkSpend,
      vendorFeeTotal,
      thisEventCommitted,
      totalCommittedInMonth,
      remaining,
    };
  }, [
    event,
    checklist,
    eventVendors,
    vendorFeeTotal,
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

  const playbookPlanning = useMemo(
    () => (event ? computePlaybookPlanningProgress(event) : null),
    [event]
  );

  const allPlaybookPlanningComplete = useMemo(() => {
    if (!playbookPlanning || playbookPlanning.total === 0) return false;
    return playbookPlanning.completed >= playbookPlanning.total;
  }, [playbookPlanning]);

  const atRisk = useMemo(() => {
    if (!event || playbookPlanning == null) return false;
    return isEventAtRiskByPlanning(
      event.date,
      event.status,
      playbookPlanning.percentage
    );
  }, [event, playbookPlanning]);

  const isLiveMode = event?.is_live_mode ?? false;

  const checklistCompleted = checklist.filter((i) => i.is_checked).length;
  const checklistTotal = checklist.length;

  const onChecklistInvalidate = useCallback(
    () => void refetch.checklist(),
    [refetch]
  );

  const handleToggleLiveMode = useCallback(async () => {
    if (!event) return;
    try {
      const updated = await apiPatchEvent(event.id, {
        is_live_mode: !event.is_live_mode,
      });
      setEvent(updated);
    } catch (err) {
      console.error("Failed to toggle live mode:", err);
      showError(errorMessage(err, "Failed to toggle live mode."));
    }
  }, [event, setEvent]);

  const handleToggleSwapMeet = useCallback(async (enabled: boolean) => {
    if (!event) return;
    try {
      const updated = await apiPatchEvent(event.id, {
        has_swap_meet: enabled,
      });
      setEvent(updated);
      if (enabled) void refetch.swapMeetSpots();
    } catch (err) {
      console.error("Failed to update swap meet:", err);
      showError(errorMessage(err, "Failed to update swap meet."));
    }
  }, [event, setEvent, refetch]);

  const handleStatusChange = useCallback(
    async (newStatus: EventStatus) => {
      if (!event) return;
      try {
        const updated = await apiPatchEvent(event.id, { status: newStatus });
        setEvent(updated);
      } catch (err) {
        console.error("Failed to update status:", err);
        showError(errorMessage(err, "Failed to update status."));
      }
    },
    [event, setEvent]
  );

  const handleDelete = useCallback(async () => {
    if (!event) return;
    if (
      !confirm(
        "Are you sure you want to delete this event? This cannot be undone."
      )
    )
      return;
    try {
      await apiDeleteEvent(event.id);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to delete event:", err);
      showError("Failed to delete event.");
    }
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
    swapMeetSpots,
    localPatch,
    refetch,
    eventMonthYearMonth,
    budgetSummaryForEventMonth,
    canManageEvents,
    isAdmin,
    showStatusPills,
    setShowStatusPills,
    allChecklistComplete,
    allPlaybookPlanningComplete,
    playbookPlanning,
    atRisk,
    isLiveMode,
    checklistCompleted,
    checklistTotal,
    onChecklistInvalidate,
    onBudgetContextInvalidate,
    checklistEstimatedTotal,
    vendorFeeTotal,
    handleToggleLiveMode,
    handleToggleSwapMeet,
    handleStatusChange,
    handleDelete,
    onBudgetPeersMonthChange: (yearMonth: string) => {
      void refetch.budgetContextForMonth(yearMonth);
    },
  };
}
