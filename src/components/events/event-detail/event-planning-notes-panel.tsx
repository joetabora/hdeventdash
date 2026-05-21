"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { apiPatchEvent } from "@/lib/events-api-client";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/events/event-detail/collapsible-section";
import { Loader2, Save, StickyNote } from "lucide-react";
import { showError } from "@/lib/toast";

type Variant = "inline" | "page";

type PlanningNotesFormProps = {
  eventId: string;
  notes: string;
  setNotes: (v: string) => void;
  canEdit: boolean;
  saving: boolean;
  savedAt: Date | null;
  onSave: () => void;
  textareaMinHeightClass: string;
  showOpenFullLink: boolean;
};

function PlanningNotesForm({
  notes,
  setNotes,
  canEdit,
  saving,
  savedAt,
  onSave,
  textareaMinHeightClass,
  showOpenFullLink,
  eventId,
}: PlanningNotesFormProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-harley-text-muted">
        Scratch pad while you coordinate — separate from playbook print and recap
        notes.
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Meeting notes, ideas, follow-ups..."
        disabled={!canEdit}
        className={`w-full px-4 py-3 rounded-xl bg-harley-gray-light/30 border border-harley-gray-lighter/50 text-harley-text text-base leading-relaxed placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 resize-y disabled:opacity-70 disabled:cursor-not-allowed ${textareaMinHeightClass}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!canEdit ? (
          <span className="text-xs text-harley-text-muted">
            Editing is limited to managers and admins.
          </span>
        ) : savedAt ? (
          <span className="text-xs text-harley-text-muted">
            Saved {format(savedAt, "h:mm a")}
          </span>
        ) : (
          <span className="text-xs text-harley-text-muted">
            Click Save when ready.
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {showOpenFullLink ? (
            <Link
              href={`/events/${eventId}/notes`}
              className={`${buttonStyles.secondary("sm")} text-xs`}
            >
              Open full page
            </Link>
          ) : null}
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              onClick={() => void onSave()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type EventPlanningNotesPanelProps = {
  eventId: string;
  initialNotes: string;
  canEdit: boolean;
  onSaved?: (notes: string | null) => void;
  variant: Variant;
  /** When incremented, opens inline section (header Notes shortcut). */
  expandNonce?: number;
};

export function EventPlanningNotesPanel({
  eventId,
  initialNotes,
  canEdit,
  onSaved,
  variant,
  expandNonce,
}: EventPlanningNotesPanelProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  async function handleSave() {
    setSaving(true);
    try {
      const trimmed = notes.trim();
      await apiPatchEvent(eventId, {
        planning_notes: trimmed ? trimmed : null,
      });
      setSavedAt(new Date());
      onSaved?.(trimmed ? trimmed : null);
    } catch (err) {
      console.error("Failed to save planning notes:", err);
      showError("Failed to save notes.");
    } finally {
      setSaving(false);
    }
  }

  const hasContent = Boolean(initialNotes?.trim());

  const form = (
    <PlanningNotesForm
      eventId={eventId}
      notes={notes}
      setNotes={setNotes}
      canEdit={canEdit}
      saving={saving}
      savedAt={savedAt}
      onSave={handleSave}
      textareaMinHeightClass={
        variant === "page" ? "min-h-[60vh]" : "min-h-[10rem] md:min-h-[12rem]"
      }
      showOpenFullLink={variant === "inline"}
    />
  );

  if (variant === "page") {
    return (
      <div className="space-y-3">
        {form}
      </div>
    );
  }

  return (
    <div className="print:hidden">
      <CollapsibleSection
        icon={<StickyNote className="w-4 h-4" />}
        title="Planning notes"
        defaultOpen={hasContent}
        expandNonce={expandNonce}
        id="event-planning-notes"
      >
        <Card className="!p-3.5 md:!p-4">{form}</Card>
      </CollapsibleSection>
    </div>
  );
}
