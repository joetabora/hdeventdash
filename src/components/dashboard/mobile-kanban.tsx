"use client";

import { useMemo, useState } from "react";
import { Event, EventStatus, EVENT_STATUSES } from "@/types/database";
import { EventCard } from "@/components/events/event-card";
import { Select } from "@/components/ui/input";

interface MobileKanbanProps {
  events: Event[];
  onStatusChange: (eventId: string, newStatus: EventStatus) => Promise<void>;
  atRiskIds: Set<string>;
  /** When true, status cannot be changed (e.g. staff role). */
  readOnly?: boolean;
}

const STATUS_OPTIONS = EVENT_STATUSES.map(({ value, label }) => ({
  value,
  label,
}));

/**
 * Phone/tablet replacement for the drag-and-drop board: one lane at a time,
 * picked from a scrollable status bar, with a per-card "move to" select for
 * managers instead of dragging.
 */
export function MobileKanban({
  events,
  onStatusChange,
  atRiskIds,
  readOnly = false,
}: MobileKanbanProps) {
  const countsByStatus = useMemo(() => {
    const counts = new Map<EventStatus, number>();
    for (const event of events) {
      counts.set(event.status, (counts.get(event.status) ?? 0) + 1);
    }
    return counts;
  }, [events]);

  const firstPopulated = useMemo(
    () =>
      EVENT_STATUSES.find(({ value }) => (countsByStatus.get(value) ?? 0) > 0)
        ?.value ?? EVENT_STATUSES[0].value,
    [countsByStatus]
  );

  const [selected, setSelected] = useState<EventStatus | null>(null);
  const activeLane = selected ?? firstPopulated;
  const laneEvents = events.filter((e) => e.status === activeLane);

  return (
    <div className="space-y-3">
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        role="tablist"
        aria-label="Event status lanes"
      >
        {EVENT_STATUSES.map(({ value, label }) => {
          const isActive = value === activeLane;
          const count = countsByStatus.get(value) ?? 0;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelected(value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                isActive
                  ? "border-harley-orange/60 bg-harley-orange/12 text-harley-orange"
                  : "border-border-subtle bg-surface-base/55 text-harley-text-muted"
              }`}
            >
              {label}
              <span
                className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                  isActive
                    ? "bg-harley-orange/18 text-harley-orange"
                    : "bg-surface-overlay/92 text-harley-text-muted ring-1 ring-border-subtle/80"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {laneEvents.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border-subtle/85 py-12">
          <p className="text-xs font-medium text-harley-text-muted/60">
            No events in this lane
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {laneEvents.map((event) => (
            <div key={event.id} className="space-y-1.5">
              <EventCard event={event} atRisk={atRiskIds.has(event.id)} />
              {!readOnly && (
                <Select
                  aria-label={`Move "${event.name}" to another lane`}
                  options={STATUS_OPTIONS}
                  value={event.status}
                  onChange={(e) =>
                    void onStatusChange(
                      event.id,
                      e.target.value as EventStatus
                    )
                  }
                  className="!py-1.5 text-xs"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
