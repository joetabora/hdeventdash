"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Event,
  EventStatus,
  EventType,
  MonthlyBudget,
  EVENT_STATUSES,
  EVENT_TYPES,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getMonthlyBudgetsForMonth,
  budgetMonthToDbDate,
  eventDateToYearMonth,
  totalMonthlyBudgetCapacity,
  sumOthersPlannedForMonth,
} from "@/lib/budgets";
import { normalizeLocationKey } from "@/lib/location-key";
import { Loader2, AlertTriangle } from "lucide-react";

function formatBudgetUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

interface EventFormProps {
  event?: Partial<Event>;
  /** Managers/admins only — staff cannot edit budget fields (DB-enforced). */
  canEditBudget?: boolean;
  /** Other org events (non-archived) for planned-vs-cap check; omit to skip validation. */
  allEvents?: Event[];
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
  const [eventType, setEventType] = useState<EventType | "">(
    (event?.event_type as EventType | undefined) ?? ""
  );
  const [plannedBudget, setPlannedBudget] = useState(
    event?.planned_budget != null ? String(event.planned_budget) : ""
  );
  const [actualBudget, setActualBudget] = useState(
    event?.actual_budget != null ? String(event.actual_budget) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudget[]>([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetOverrideConfirmed, setBudgetOverrideConfirmed] = useState(false);

  const yearMonth =
    date.length >= 7 ? eventDateToYearMonth(date) : null;
  const locationTrimmed = location.trim();
  const locationKey = normalizeLocationKey(locationTrimmed);

  useEffect(() => {
    if (!yearMonth) {
      setMonthlyBudgets([]);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    setBudgetsLoading(true);
    getMonthlyBudgetsForMonth(supabase, budgetMonthToDbDate(yearMonth))
      .then((rows) => {
        if (!cancelled) setMonthlyBudgets(rows);
      })
      .catch(() => {
        if (!cancelled) setMonthlyBudgets([]);
      })
      .finally(() => {
        if (!cancelled) setBudgetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [yearMonth]);

  const budgetCheck = useMemo(() => {
    if (!canEditBudget || !yearMonth) {
      return {
        cap: 0,
        othersPlanned: 0,
        thisPlanned: 0,
        total: 0,
        exceeds: false,
      };
    }
    const thisPlanned = numOrNull(plannedBudget) ?? 0;
    const cap = totalMonthlyBudgetCapacity(monthlyBudgets, locationKey);
    const othersPlanned = sumOthersPlannedForMonth(
      allEvents,
      yearMonth,
      locationKey,
      event?.id
    );
    const total = othersPlanned + thisPlanned;
    const exceeds = cap > 0 && total > cap;
    return {
      cap,
      othersPlanned,
      thisPlanned,
      total,
      exceeds,
    };
  }, [
    canEditBudget,
    yearMonth,
    allEvents,
    monthlyBudgets,
    locationKey,
    plannedBudget,
    event?.id,
  ]);

  useEffect(() => {
    setBudgetOverrideConfirmed(false);
  }, [date, location, plannedBudget, yearMonth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    setLoading(true);
    setError("");
    try {
      await onSubmit({
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
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
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
              {budgetsLoading
                ? "Loading monthly cap…"
                : budgetCheck.cap > 0
                  ? `Monthly cap for ${yearMonth}${locationTrimmed ? ` · ${locationTrimmed}` : " (all locations combined)"}: ${formatBudgetUsd(budgetCheck.cap)} · Other events this month: ${formatBudgetUsd(budgetCheck.othersPlanned)}`
                  : `No monthly cap set for ${yearMonth}${locationTrimmed ? ` at "${locationTrimmed}"` : ""}. Add one on the dashboard if you want warnings.`}
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
                      With this event, planned spend for{" "}
                      <strong>{yearMonth}</strong>
                      {locationTrimmed
                        ? <> at <strong>{locationTrimmed}</strong></>
                        : <> (all locations)</>}{" "}
                      would be{" "}
                      <strong>{formatBudgetUsd(budgetCheck.total)}</strong>,
                      over the cap of{" "}
                      <strong>{formatBudgetUsd(budgetCheck.cap)}</strong> (
                      {formatBudgetUsd(budgetCheck.total - budgetCheck.cap)}{" "}
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
                      if (e.target.checked) setError("");
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

      {error && (
        <div className="text-harley-danger text-sm bg-harley-danger/10 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
