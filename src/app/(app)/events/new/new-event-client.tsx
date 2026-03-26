"use client";

import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createEvent } from "@/lib/events";
import { EventForm } from "@/components/events/event-form";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Event, EventType } from "@/types/database";

export function NewEventClient({
  userId,
  initialAllEvents,
}: {
  userId: string;
  initialAllEvents: Event[];
}) {
  const router = useRouter();
  const supabaseRef = useRef(
    typeof window !== "undefined" ? createClient() : null
  );
  const [allEvents, setAllEvents] = useState<Event[]>(initialAllEvents);

  useLayoutEffect(() => {
    setAllEvents(initialAllEvents);
  }, [initialAllEvents]);

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
      const supabase = supabaseRef.current;
      if (!supabase) throw new Error("Not authenticated");
      const event = await createEvent(supabase, {
        ...data,
        status: data.status as "idea",
        user_id: userId,
        onedrive_link: data.onedrive_link || undefined,
        event_type: data.event_type,
        planned_budget: data.planned_budget,
        actual_budget: data.actual_budget,
      });
      router.push(`/events/${event.id}`);
    },
    [router, userId]
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
          allEvents={allEvents}
          onSubmit={handleCreate}
          onCancel={() => router.push("/dashboard")}
        />
      </Card>
    </div>
  );
}
