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

export function KanbanBoard({ events, onStatusChange, atRiskIds }: KanbanBoardProps) {
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
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

      <DragOverlay>
        {activeEvent ? (
          <EventCard
            event={activeEvent}
            compact
            atRisk={atRiskIds.has(activeEvent.id)}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
