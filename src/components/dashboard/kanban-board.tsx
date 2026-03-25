"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { Event, EventStatus, EVENT_STATUSES } from "@/types/database";
import { KanbanColumn } from "./kanban-column";
import { EventCard } from "@/components/events/event-card";

interface KanbanBoardProps {
  events: Event[];
  onStatusChange: (eventId: string, newStatus: EventStatus) => Promise<void>;
  atRiskIds: Set<string>;
}

const dropAnimationConfig = {
  duration: 200,
  easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
};

export function KanbanBoard({ events, onStatusChange, atRiskIds }: KanbanBoardProps) {
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const draggedEvent = events.find((e) => e.id === event.active.id);
    if (draggedEvent) setActiveEvent(draggedEvent);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveEvent(null);
    const { active, over } = event;
    if (!over) return;

    const eventId = active.id as string;
    const newStatus = over.id as EventStatus;
    const currentEvent = events.find((e) => e.id === eventId);

    if (currentEvent && currentEvent.status !== newStatus) {
      await onStatusChange(eventId, newStatus);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-6 gap-3 min-w-[1080px] overflow-x-auto pb-2">
        {EVENT_STATUSES.map(({ value, label }) => {
          const columnEvents = events.filter((e) => e.status === value);
          return (
            <KanbanColumn
              key={value}
              id={value}
              title={label}
              count={columnEvents.length}
              events={columnEvents}
              atRiskIds={atRiskIds}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={dropAnimationConfig}>
        {activeEvent ? (
          <div className="rotate-[2deg] scale-[1.03] opacity-95">
            <EventCard
              event={activeEvent}
              compact
              atRisk={atRiskIds.has(activeEvent.id)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
