"use client";

import { useState } from "react";
import { apiPatchEvent } from "@/lib/events-api-client";
import { Event } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Archive, Save, Loader2 } from "lucide-react";

interface EventRecapProps {
  event: Event;
  onUpdate: () => void;
  canEdit?: boolean;
}

export function EventRecap({ event, onUpdate, canEdit = true }: EventRecapProps) {
  const [attendance, setAttendance] = useState<string>(
    event.attendance?.toString() || ""
  );
  const [notes, setNotes] = useState(event.recap_notes || "");
  const [salesEstimate, setSalesEstimate] = useState<string>(
    event.sales_estimate?.toString() || ""
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await apiPatchEvent(event.id, {
        attendance: attendance ? parseInt(attendance) : null,
        recap_notes: notes || null,
        sales_estimate: salesEstimate ? parseFloat(salesEstimate) : null,
      });
      onUpdate();
    } catch (err) {
      console.error("Failed to save recap:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (
      !confirm(
        "Archive this event? It will be hidden from the dashboard."
      )
    )
      return;
    try {
      await apiPatchEvent(event.id, {
        is_archived: true,
        status: "completed",
      });
      onUpdate();
    } catch (err) {
      console.error("Failed to archive:", err);
    }
  }

  return (
    <Card className="!p-3.5 md:!p-5">
      <h3 className="font-semibold text-harley-text mb-4">Event Recap</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Attendance"
            type="number"
            value={attendance}
            onChange={(e) => setAttendance(e.target.value)}
            placeholder="Number of attendees"
            disabled={!canEdit}
          />
          <Input
            label="Sales Estimate ($)"
            type="number"
            value={salesEstimate}
            onChange={(e) => setSalesEstimate(e.target.value)}
            placeholder="0.00"
            disabled={!canEdit}
          />
        </div>

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Key takeaways, lessons learned, follow-up items..."
          rows={4}
          disabled={!canEdit}
        />

        {canEdit ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Recap
            </Button>

            {event.status === "completed" && !event.is_archived && (
              <Button variant="secondary" onClick={handleArchive} className="w-full sm:w-auto">
                <Archive className="w-4 h-4" />
                Archive Event
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-harley-text-muted">
            Recap editing is limited to managers and admins.
          </p>
        )}
      </div>
    </Card>
  );
}
