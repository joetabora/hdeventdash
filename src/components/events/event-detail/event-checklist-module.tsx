"use client";

import { ChecklistSectionComponent } from "@/components/events/checklist-section";
import { ProgressBar } from "@/components/events/progress-bar";
import { ChecklistItem, CHECKLIST_SECTIONS } from "@/types/database";
import { AlertTriangle, CheckCircle2, ClipboardList } from "lucide-react";
import { CollapsibleSection } from "./collapsible-section";

export function EventChecklistModule({
  mode,
  eventId,
  checklist,
  canManageEvents,
  onChecklistInvalidate,
  onBudgetContextInvalidate,
  atRisk,
  allChecklistComplete,
}: {
  mode: "live" | "standard";
  eventId: string;
  checklist: ChecklistItem[];
  canManageEvents: boolean;
  onChecklistInvalidate: () => void;
  onBudgetContextInvalidate?: () => void;
  atRisk?: boolean;
  allChecklistComplete?: boolean;
}) {
  const sections = CHECKLIST_SECTIONS.map((section) => {
    const items = checklist.filter((item) => item.section === section);
    return (
      <ChecklistSectionComponent
        key={section}
        section={section}
        items={items}
        eventId={eventId}
        onUpdate={onChecklistInvalidate}
        onBudgetContextInvalidate={onBudgetContextInvalidate}
        liveMode={mode === "live"}
        allowStructureEdit={canManageEvents}
      />
    );
  });

  if (mode === "live") {
    return (
      <>
        <ProgressBar variant="live" checklist={checklist} />
        {atRisk && (
          <div className="p-4 rounded-xl bg-harley-danger/10 border border-harley-danger/30 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-harley-danger shrink-0 mt-0.5" />
            <p className="text-base sm:text-lg text-harley-danger font-medium leading-snug">
              At risk: event soon and checklist not complete. Prioritize open tasks.
            </p>
          </div>
        )}
        {allChecklistComplete && (
          <div className="p-4 sm:p-5 rounded-xl bg-harley-success/10 border border-harley-success/35 flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-harley-success shrink-0" />
            <span className="text-base sm:text-lg text-harley-success font-semibold">
              All checklist items complete — great work!
            </span>
          </div>
        )}
        <div className="space-y-4 sm:space-y-5 pt-1">{sections}</div>
      </>
    );
  }

  return (
    <CollapsibleSection
      icon={<ClipboardList className="w-4.5 h-4.5" />}
      title="Checklist"
      defaultOpen={true}
    >
      {canManageEvents && (
        <p className="text-xs text-harley-text-muted mb-3 leading-relaxed">
          Open item details to set an optional estimated cost per line. Those
          amounts roll into the monthly venue budget with this event&apos;s
          planned budget.
        </p>
      )}
      <div className="space-y-3">{sections}</div>
    </CollapsibleSection>
  );
}
