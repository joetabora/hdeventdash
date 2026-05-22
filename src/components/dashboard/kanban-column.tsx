"use client";

import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Event } from "@/types/database";
import { EventCard } from "@/components/events/event-card";

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  events: Event[];
  atRiskIds: Set<string>;
  readOnly?: boolean;
}

export function KanbanColumn({
  id,
  title,
  count,
  events,
  atRiskIds,
  readOnly = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: readOnly });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[calc(100vh-16rem)] flex-col rounded-xl border transition-all duration-200 ${
        isOver
          ? "border-harley-orange/60 bg-harley-orange/[0.04] shadow-[inset_0_0_24px_var(--color-harley-orange)/0.06]"
          : "border-border-subtle bg-surface-base/55"
      }`}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 rounded-t-xl border-b border-border-subtle bg-surface-overlay/92 px-3.5 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-harley-text uppercase truncate">
            {title}
          </h3>
          <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-surface-overlay/92 px-1.5 text-[10px] font-bold tabular-nums text-harley-text-muted ring-1 ring-border-subtle/80">
            {count}
          </span>
        </div>
      </div>

      {/* Scrollable card area */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto">
        {events.map((event) => (
          <DraggableEventCard
            key={event.id}
            event={event}
            atRisk={atRiskIds.has(event.id)}
            disabled={readOnly}
          />
        ))}
        {events.length === 0 && (
          <div className={`flex items-center justify-center py-12 rounded-lg border border-dashed transition-colors ${
            isOver ? "border-harley-orange/40 text-harley-orange/65" : "border-border-subtle/85 text-harley-text-muted/42"
          }`}>
            <p className="text-xs font-medium">
              {readOnly ? "No events" : "Drop here"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableEventCard({
  event,
  atRisk,
  disabled,
}: {
  event: Event;
  atRisk: boolean;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: event.id, disabled: !!disabled });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        transition: "box-shadow 200ms ease",
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`transition-opacity duration-150 ${
        isDragging ? "opacity-30 scale-[0.98]" : "opacity-100"
      }`}
    >
      <EventCard event={event} atRisk={atRisk} />
    </div>
  );
}
