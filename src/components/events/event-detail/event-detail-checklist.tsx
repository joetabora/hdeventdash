"use client";

import { EventChecklistModule } from "@/components/events/event-detail/event-checklist-module";
import type { ChecklistItem, ChecklistSection } from "@/types/database";

export function EventDetailChecklist({
  mode,
  eventId,
  checklist,
  canManageEvents,
  onChecklistInvalidate,
  onOptimisticPatch,
  onBudgetContextInvalidate,
  atRisk,
  allChecklistComplete,
  sectionsFilter,
  embedded = false,
}: {
  mode: "live" | "standard";
  eventId: string;
  checklist: ChecklistItem[];
  canManageEvents: boolean;
  onChecklistInvalidate: () => void;
  onOptimisticPatch?: (itemId: string, updates: Partial<ChecklistItem>) => void;
  onBudgetContextInvalidate?: () => void;
  atRisk?: boolean;
  allChecklistComplete?: boolean;
  sectionsFilter?: readonly ChecklistSection[];
  embedded?: boolean;
}) {
  return (
    <EventChecklistModule
      mode={mode}
      eventId={eventId}
      checklist={checklist}
      canManageEvents={canManageEvents}
      onChecklistInvalidate={onChecklistInvalidate}
      onOptimisticPatch={onOptimisticPatch}
      onBudgetContextInvalidate={onBudgetContextInvalidate}
      atRisk={atRisk}
      allChecklistComplete={allChecklistComplete}
      sectionsFilter={sectionsFilter}
      embedded={embedded}
    />
  );
}
