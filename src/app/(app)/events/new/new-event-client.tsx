"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { apiCreateEvent } from "@/lib/events-api-client";
import { EventForm } from "@/components/events/event-form";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Event, EventStatus, EventType } from "@/types/database";

export function NewEventClient({
  initialAllEvents,
}: {
  initialAllEvents: Event[];
}) {
  const router = useRouter();

  const handleCreate = useCallback(
    async (data: {
      name: string;
      date: string;
      location: string;
      owner: string;
      status: string;
      description: string;
      onedrive_link: string;
      event_type: EventType | null;
      planned_budget: number | null;
      actual_budget: number | null;
    }) => {
      const event = await apiCreateEvent({
        name: data.name,
        date: data.date,
        location: data.location,
        owner: data.owner,
        status: data.status as EventStatus,
        description: data.description,
        onedrive_link: data.onedrive_link || undefined,
        event_type: data.event_type,
        planned_budget: data.planned_budget,
        actual_budget: data.actual_budget,
      });
      router.push(`/events/${event.id}`);
    },
    [router]
  );

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <Card padding="lg">
        <EventForm
          canEditBudget
          allEvents={initialAllEvents}
          onSubmit={handleCreate}
          onCancel={() => router.push("/dashboard")}
        />
      </Card>
    </div>
  );
}
