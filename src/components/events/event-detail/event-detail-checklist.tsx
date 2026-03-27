"use client";

import { EventChecklistModule } from "@/components/events/event-detail/event-checklist-module";
import type { ChecklistItem } from "@/types/database";

export function EventDetailChecklist({
  mode,
  eventId,
  checklist,
  canManageEvents,
  onChecklistInvalidate,
  atRisk,
  allChecklistComplete,
}: {
  mode: "live" | "standard";
  eventId: string;
  checklist: ChecklistItem[];
  canManageEvents: boolean;
  onChecklistInvalidate: () => void;
  atRisk?: boolean;
  allChecklistComplete?: boolean;
}) {
  return (
    <EventChecklistModule
      mode={mode}
      eventId={eventId}
      checklist={checklist}
      canManageEvents={canManageEvents}
      onChecklistInvalidate={onChecklistInvalidate}
      atRisk={atRisk}
      allChecklistComplete={allChecklistComplete}
    />
  );
}
