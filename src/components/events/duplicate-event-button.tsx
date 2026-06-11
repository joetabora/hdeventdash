"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addYears, format, parseISO } from "date-fns";
import { Copy, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiCloneEvent } from "@/lib/events-api-client";
import { errorMessage, showError, showSuccess } from "@/lib/toast";

function defaultCloneDate(sourceDate: string): string {
  try {
    return format(addYears(parseISO(sourceDate), 1), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

/**
 * "Duplicate" action for the event detail header (managers/admins).
 * Clones playbook content, checklist structure, and the vendor lineup into a
 * fresh event; per-run state (checkmarks, marketing dates, recap, ROI) resets.
 */
export function DuplicateEventButton({
  eventId,
  sourceName,
  sourceDate,
}: {
  eventId: string;
  sourceName: string;
  sourceDate: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function open() {
    setName(`${sourceName} (Copy)`.slice(0, 500));
    setDate(defaultCloneDate(sourceDate));
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = name.trim();
    if (!trimmed || !date) return;
    setSubmitting(true);
    try {
      const clone = await apiCloneEvent(eventId, { name: trimmed, date });
      showSuccess("Event duplicated — review the new plan.");
      setIsOpen(false);
      router.push(`/events/${clone.id}`);
    } catch (err) {
      showError(errorMessage(err, "Failed to duplicate event."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={open}
        className="!px-2.5 md:!px-3"
        title="Duplicate this event as a fresh plan"
      >
        <Copy className="w-4 h-4" />
        <span className="hidden md:inline">Duplicate</span>
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!submitting) setIsOpen(false);
        }}
        title="Duplicate event"
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-harley-text-muted">
            Copies the playbook, checklist, budget, and vendor lineup into a new
            event. Checkmarks, marketing dates, recap, and ROI start fresh.
            Documents, media, and comments are not copied.
          </p>
          <Input
            label="New event name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={500}
            required
          />
          <Input
            label="Event date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim() || !date}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Duplicating…
                </>
              ) : (
                "Duplicate event"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
