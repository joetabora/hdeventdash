"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Event,
  EventStatus,
  EventType,
  MonthlyBudget,
  EVENT_STATUSES,
  EVENT_TYPES,
} from "@/types/database";
import type { EventBudgetPeer } from "@/lib/budgets";
import { FormActions } from "@/components/forms/form-actions";
import { FormErrorAlert } from "@/components/forms/form-error-alert";
import { Input, Textarea, Select } from "@/components/ui/input";
import { useFormSubmitState } from "@/hooks/use-form-submit-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getMonthlyBudgetsForMonth,
  budgetMonthToDbDate,
  eventDateToYearMonth,
  effectiveMonthlyCapForEvent,
  sumOthersPlannedForMonth,
} from "@/lib/budgets";
import { normalizeLocationKey } from "@/lib/location-key";
import { formatUsd } from "@/lib/format-currency";
import { AlertTriangle } from "lucide-react";

interface EventFormProps {
  event?: Partial<Event>;
  /** Managers/admins only — staff cannot edit budget fields (DB-enforced). */
  canEditBudget?: boolean;
  /** Same-calendar-month peers for planned-vs-cap check; omit to skip validation. */
  allEvents?: EventBudgetPeer[];
  /** When the event date changes, parent refetches peers for that month (edit / create flows). */
  onBudgetPeersMonthChange?: (yearMonth: string) => void;
  /** When this matches `yearMonth` from the date field, caps come from the parent (SSR / refetch) instead of a separate client query. */
  prefetchedMonthlyBudgets?: MonthlyBudget[];
  prefetchedForYearMonth?: string | null;
  /** Sum of checklist line estimated costs for this event (edit flow); included in cap math with planned budget. */
  checklistEstimatedTotalForEvent?: number;
  onSubmit: (data: {
    name: string;
    date: string;
    location: string;
    owner: string;
    status: EventStatus;
    description: string;
    onedrive_link: string;
    event_type: EventType | null;
    planned_budget: number | null;
    actual_budget: number | null;
    event_goals: string | null;
    core_activities: string | null;
  }) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

function numOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function EventForm({
  event,
  canEditBudget = false,
  allEvents = [],
  prefetchedMonthlyBudgets,
  prefetchedForYearMonth = null,
  checklistEstimatedTotalForEvent = 0,
  onBudgetPeersMonthChange,
  onSubmit,
  onCancel,
  submitLabel = "Create Event",
}: EventFormProps) {
  const [name, setName] = useState(event?.name || "");
  const [date, setDate] = useState(event?.date || "");
  const [location, setLocation] = useState(event?.location || "");
  const [owner, setOwner] = useState(event?.owner || "");
  const [status, setStatus] = useState<EventStatus>(event?.status || "idea");
  const [description, setDescription] = useState(event?.description || "");
  const [onedriveLink, setOnedriveLink] = useState(event?.onedrive_link || "");
  const [eventGoals, setEventGoals] = useState(event?.event_goals || "");
  const [coreActivities, setCoreActivities] = useState(event?.core_activities || "");
  const [eventType, setEventType] = useState<EventType | "">(
    (event?.event_type as EventType | undefined) ?? ""
  );
  const [plannedBudget, setPlannedBudget] = useState(
    event?.planned_budget != null ? String(event.planned_budget) : ""
  );
  const [actualBudget, setActualBudget] = useState(
    event?.actual_budget != null ? String(event.actual_budget) : ""
  );
  const { pending, error, setError, clearError, run } = useFormSubmitState();
  const [fetchedMonthlyBudgets, setFetchedMonthlyBudgets] = useState<
    MonthlyBudget[]
  >([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetOverrideConfirmed, setBudgetOverrideConfirmed] = useState(false);
  const skipNextBudgetMonthFetch = useRef(true);

  const yearMonth =
    date.length >= 7 ? eventDateToYearMonth(date) : null;
  const locationTrimmed = location.trim();
  const locationKey = normalizeLocationKey(locationTrimmed);

  const budgetsFromParent =
    yearMonth != null &&
    prefetchedForYearMonth != null &&
    yearMonth === prefetchedForYearMonth &&
    prefetchedMonthlyBudgets !== undefined;

  const capBudgetRows = useMemo(() => {
    if (!yearMonth) return [];
    if (budgetsFromParent) return prefetchedMonthlyBudgets;
    return fetchedMonthlyBudgets;
  }, [
    yearMonth,
    budgetsFromParent,
    prefetchedMonthlyBudgets,
    fetchedMonthlyBudgets,
  ]);

  const budgetsLoadingEffective =
    Boolean(yearMonth) && !budgetsFromParent && budgetsLoading;

  useEffect(() => {
    if (!yearMonth || budgetsFromParent) return;
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setBudgetsLoading(true);
    });
    getMonthlyBudgetsForMonth(supabase, budgetMonthToDbDate(yearMonth))
      .then((rows) => {
        if (!cancelled) setFetchedMonthlyBudgets(rows);
      })
      .catch(() => {
        if (!cancelled) setFetchedMonthlyBudgets([]);
      })
      .finally(() => {
        if (!cancelled) setBudgetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [yearMonth, budgetsFromParent]);

  const budgetCheck = useMemo(() => {
    if (!canEditBudget || !yearMonth) {
      return {
        cap: 0,
        othersPlanned: 0,
        thisPlanned: 0,
        checklistLineSpend: 0,
        total: 0,
        exceeds: false,
      };
    }
    const thisPlanned = numOrNull(plannedBudget) ?? 0;
    const checklistLineSpend = Math.max(0, checklistEstimatedTotalForEvent);
    const thisCommitted = thisPlanned + checklistLineSpend;
    const cap = effectiveMonthlyCapForEvent(capBudgetRows, locationKey);
    const singleVenueMonth = capBudgetRows.length === 1;
    const othersPlanned = sumOthersPlannedForMonth(
      allEvents,
      yearMonth,
      singleVenueMonth ? "" : locationKey,
      event?.id
    );
    const total = othersPlanned + thisCommitted;
    const exceeds = cap > 0 && total > cap;
    return {
      cap,
      othersPlanned,
      thisPlanned,
      checklistLineSpend,
      total,
      exceeds,
    };
  }, [
    canEditBudget,
    yearMonth,
    allEvents,
    capBudgetRows,
    locationKey,
    plannedBudget,
    checklistEstimatedTotalForEvent,
    event?.id,
  ]);

  useEffect(() => {
    void Promise.resolve().then(() => setBudgetOverrideConfirmed(false));
  }, [date, location, plannedBudget, yearMonth, checklistEstimatedTotalForEvent]);

  useEffect(() => {
    if (!canEditBudget || !onBudgetPeersMonthChange) return;
    if (skipNextBudgetMonthFetch.current) {
      skipNextBudgetMonthFetch.current = false;
      return;
    }
    const ym = date.length >= 7 ? eventDateToYearMonth(date) : null;
    if (!ym) return;
    const t = setTimeout(() => onBudgetPeersMonthChange(ym), 300);
    return () => clearTimeout(t);
  }, [date, canEditBudget, onBudgetPeersMonthChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (!name.trim() || !date) {
      setError("Name and date are required");
      return;
    }
    if (
      canEditBudget &&
      budgetCheck.exceeds &&
      !budgetOverrideConfirmed
    ) {
      setError(
        "Planned budgets exceed the monthly cap. Confirm the override below or reduce the planned amount."
      );
      return;
    }
    await run(() =>
      onSubmit({
        name: name.trim(),
        date,
        location: location.trim(),
        owner: owner.trim(),
        status,
        description: description.trim(),
        onedrive_link: onedriveLink.trim() || "",
        event_type: eventType === "" ? null : eventType,
        planned_budget: canEditBudget
          ? numOrNull(plannedBudget)
          : (event?.planned_budget ?? null),
        actual_budget: canEditBudget
          ? numOrNull(actualBudget)
          : (event?.actual_budget ?? null),
        event_goals: eventGoals.trim() || null,
        core_activities: coreActivities.trim() || null,
      })
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Event Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Summer Kickoff Ride"
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Date *"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Milwaukee, WI"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="e.g. John Smith"
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as EventStatus)}
          options={EVENT_STATUSES}
        />
      </div>

      <Select
        label="Event type (for analytics)"
        value={eventType}
        onChange={(e) =>
          setEventType((e.target.value || "") as EventType | "")
        }
        options={[
          { value: "", label: "Not set" },
          ...EVENT_TYPES,
        ]}
      />

      <Textarea
        label="Event Purpose & Goals"
        value={eventGoals}
        onChange={(e) => setEventGoals(e.target.value)}
        placeholder="e.g. Drive dealership traffic, increase sales in MotorClothes & Parts, GOAL: 35 QR Scans"
        rows={3}
      />

      <Textarea
        label="Core Activities"
        value={coreActivities}
        onChange={(e) => setCoreActivities(e.target.value)}
        placeholder="e.g. Food & Refreshments, Entertainment (DJ/live band), Bike wash & test rides, Raffles & giveaways"
        rows={3}
      />

      {canEditBudget && (
        <div className="space-y-3 p-4 rounded-lg border border-harley-orange/25 bg-harley-orange/5">
          <p className="text-xs text-harley-text-muted">
            Budget (managers only)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Planned budget ($)"
              type="number"
              min={0}
              step={0.01}
              value={plannedBudget}
              onChange={(e) => setPlannedBudget(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Actual budget ($, optional)"
              type="number"
              min={0}
              step={0.01}
              value={actualBudget}
              onChange={(e) => setActualBudget(e.target.value)}
              placeholder="After event"
            />
          </div>
              {yearMonth && (
            <p className="text-[11px] text-harley-text-muted">
              {budgetsLoadingEffective
                ? "Loading monthly cap…"
                : budgetCheck.cap > 0
                  ? `Monthly cap for ${yearMonth}${locationTrimmed ? ` · ${locationTrimmed}` : " (all locations combined)"}: ${formatUsd(budgetCheck.cap)} · Other events this month: ${formatUsd(budgetCheck.othersPlanned)}${budgetCheck.checklistLineSpend > 0 ? ` · Checklist estimates (this event): ${formatUsd(budgetCheck.checklistLineSpend)}` : ""}`
                  : `No monthly cap set for ${yearMonth}${locationTrimmed ? ` at "${locationTrimmed}"` : ""}. Add caps on the Budget page if you want warnings.`}
            </p>
          )}
          {budgetCheck.exceeds && (
            <div className="rounded-lg border border-harley-warning/50 bg-harley-warning/10 p-3 space-y-3">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-harley-warning shrink-0 mt-0.5" />
                  <div className="text-sm text-harley-text">
                    <p className="font-medium text-harley-warning">
                      Planned total would exceed the monthly budget
                    </p>
                    <p className="text-harley-text-muted mt-1 leading-relaxed">
                      With this event, committed spend for{" "}
                      <strong>{yearMonth}</strong>
                      {locationTrimmed
                        ? <> at <strong>{locationTrimmed}</strong></>
                        : <> (all locations)</>}{" "}
                      would be{" "}
                      <strong>{formatUsd(budgetCheck.total)}</strong>
                      {budgetCheck.checklistLineSpend > 0 ? (
                        <>
                          {" "}
                          (including{" "}
                          {formatUsd(budgetCheck.checklistLineSpend)} from
                          checklist line items)
                        </>
                      ) : null}
                      , over the cap of{" "}
                      <strong>{formatUsd(budgetCheck.cap)}</strong> (
                      {formatUsd(budgetCheck.total - budgetCheck.cap)}{" "}
                      over).
                    </p>
                    <p className="text-xs text-harley-text-muted mt-2">
                      You can still save — check the box below to confirm you
                      want to override the cap.
                    </p>
                  </div>
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer text-sm text-harley-text">
                  <input
                    type="checkbox"
                    checked={budgetOverrideConfirmed}
                    onChange={(e) => {
                      setBudgetOverrideConfirmed(e.target.checked);
                      if (e.target.checked) clearError();
                    }}
                    className="mt-1 rounded border-harley-gray-lighter"
                  />
                  <span>
                    I understand this exceeds the monthly budget and want to
                    save anyway.
                  </span>
                </label>
            </div>
          )}
        </div>
      )}

      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What's this event about?"
        rows={3}
      />

      <Input
        label="OneDrive Link (optional)"
        type="url"
        value={onedriveLink}
        onChange={(e) => setOnedriveLink(e.target.value)}
        placeholder="https://onedrive.live.com/..."
      />

      <FormErrorAlert message={error} />

      <FormActions
        pending={pending}
        submitLabel={submitLabel}
        onCancel={onCancel}
        order="submit-first"
      />
    </form>
  );
}
