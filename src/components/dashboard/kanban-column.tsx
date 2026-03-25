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
}

export function KanbanColumn({ id, title, count, events }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-harley-black rounded-xl border transition-colors ${
        isOver ? "border-harley-orange" : "border-harley-gray"
      }`}
    >
      <div className="px-4 py-3 border-b border-harley-gray">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-harley-text">{title}</h3>
          <span className="text-xs text-harley-text-muted bg-harley-gray rounded-full px-2 py-0.5">
            {count}
          </span>
        </div>
      </div>
      <div className="p-3 space-y-3 min-h-[200px]">
        {events.map((event) => (
          <DraggableEventCard key={event.id} event={event} />
        ))}
        {events.length === 0 && (
          <p className="text-xs text-harley-text-muted text-center py-8">
            Drop events here
          </p>
        )}
      </div>
    </div>
  );
}

function DraggableEventCard({ event }: { event: Event }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: event.id });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${isDragging ? "opacity-40" : ""}`}
    >
      <EventCard event={event} />
    </div>
  );
}
