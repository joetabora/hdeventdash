"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Event } from "@/types/database";
import { apiPatchEvent } from "@/lib/events-api-client";
import { useAppRole } from "@/contexts/app-role-context";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { showError } from "@/lib/toast";

export function EventNotesClient({ initialEvent }: { initialEvent: Event }) {
  const { canManageEvents } = useAppRole();
  const [notes, setNotes] = useState(initialEvent.planning_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function handleSave() {
    setSaving(true);
    try {
      await apiPatchEvent(initialEvent.id, {
        planning_notes: notes.trim() ? notes : null,
      });
      setSavedAt(new Date());
    } catch (err) {
      console.error("Failed to save planning notes:", err);
      showError("Failed to save notes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between gap-3 mb-5">
        <Link
          href={`/events/${initialEvent.id}`}
          className={`${buttonStyles.secondary("md")} min-h-11`}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to event
        </Link>
        {canManageEvents && (
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </Button>
        )}
      </div>

      <Card className="!p-4 md:!p-6">
        <div className="mb-4 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-harley-text">
              {initialEvent.name}
            </h1>
            <StatusBadge status={initialEvent.status} />
          </div>
          <p className="text-sm text-harley-text-muted">
            Planning notes ·{" "}
            {format(parseISO(initialEvent.date), "MMM d, yyyy")}
          </p>
        </div>

        <p className="text-sm text-harley-text-muted mb-3">
          Jot down meeting takeaways, ideas, and reminders while you plan this
          event. Only visible on this page — not part of the printed playbook.
        </p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Meeting notes, ideas, things to follow up on..."
          disabled={!canManageEvents}
          className="w-full min-h-[60vh] px-4 py-3 rounded-xl bg-harley-gray-light/30 border border-harley-gray-lighter/50 text-harley-text text-base leading-relaxed placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 resize-y disabled:opacity-70 disabled:cursor-not-allowed"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-harley-text-muted">
          {!canManageEvents ? (
            <span>Notes editing is limited to managers and admins.</span>
          ) : savedAt ? (
            <span>Saved {format(savedAt, "h:mm a")}</span>
          ) : (
            <span>Click Save when you are done editing.</span>
          )}
        </div>
      </Card>
    </div>
  );
}
