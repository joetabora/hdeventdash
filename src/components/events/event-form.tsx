"use client";

import { useState } from "react";
import {
  Event,
  EventStatus,
  EventType,
  EVENT_STATUSES,
  EVENT_TYPES,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface EventFormProps {
  event?: Partial<Event>;
  /** Managers/admins only — staff cannot edit budget fields (DB-enforced). */
  canEditBudget?: boolean;
  onSubmit: (data: {
    name: string;
    date: string;
    location: string;
    owner: string;
    status: EventStatus;
    description: string;
    onedrive_link: string;
    event_type: EventType | null;
    planned_budget: number | null;
    actual_budget: number | null;
  }) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

function numOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function EventForm({
  event,
  canEditBudget = false,
  onSubmit,
  onCancel,
  submitLabel = "Create Event",
}: EventFormProps) {
  const [name, setName] = useState(event?.name || "");
  const [date, setDate] = useState(event?.date || "");
  const [location, setLocation] = useState(event?.location || "");
  const [owner, setOwner] = useState(event?.owner || "");
  const [status, setStatus] = useState<EventStatus>(event?.status || "idea");
  const [description, setDescription] = useState(event?.description || "");
  const [onedriveLink, setOnedriveLink] = useState(event?.onedrive_link || "");
  const [eventType, setEventType] = useState<EventType | "">(
    (event?.event_type as EventType | undefined) ?? ""
  );
  const [plannedBudget, setPlannedBudget] = useState(
    event?.planned_budget != null ? String(event.planned_budget) : ""
  );
  const [actualBudget, setActualBudget] = useState(
    event?.actual_budget != null ? String(event.actual_budget) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !date) {
      setError("Name and date are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSubmit({
        name: name.trim(),
        date,
        location: location.trim(),
        owner: owner.trim(),
        status,
        description: description.trim(),
        onedrive_link: onedriveLink.trim() || "",
        event_type: eventType === "" ? null : eventType,
        planned_budget: canEditBudget
          ? numOrNull(plannedBudget)
          : (event?.planned_budget ?? null),
        actual_budget: canEditBudget
          ? numOrNull(actualBudget)
          : (event?.actual_budget ?? null),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Event Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Summer Kickoff Ride"
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Date *"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Milwaukee, WI"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="e.g. John Smith"
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as EventStatus)}
          options={EVENT_STATUSES}
        />
      </div>

      <Select
        label="Event type (for analytics)"
        value={eventType}
        onChange={(e) =>
          setEventType((e.target.value || "") as EventType | "")
        }
        options={[
          { value: "", label: "Not set" },
          ...EVENT_TYPES,
        ]}
      />

      {canEditBudget && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border border-harley-orange/25 bg-harley-orange/5">
          <p className="md:col-span-2 text-xs text-harley-text-muted">
            Budget (managers only)
          </p>
          <Input
            label="Planned budget ($)"
            type="number"
            min={0}
            step={0.01}
            value={plannedBudget}
            onChange={(e) => setPlannedBudget(e.target.value)}
            placeholder="0"
          />
          <Input
            label="Actual budget ($, optional)"
            type="number"
            min={0}
            step={0.01}
            value={actualBudget}
            onChange={(e) => setActualBudget(e.target.value)}
            placeholder="After event"
          />
        </div>
      )}

      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What's this event about?"
        rows={3}
      />

      <Input
        label="OneDrive Link (optional)"
        type="url"
        value={onedriveLink}
        onChange={(e) => setOnedriveLink(e.target.value)}
        placeholder="https://onedrive.live.com/..."
      />

      {error && (
        <div className="text-harley-danger text-sm bg-harley-danger/10 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
