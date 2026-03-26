"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createEvent, getEvents } from "@/lib/events";
import { EventForm } from "@/components/events/event-form";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useAppRole } from "@/contexts/app-role-context";
import type { Event, EventType } from "@/types/database";

export default function NewEventPage() {
  const router = useRouter();
  const { canManageEvents, loading: roleLoading } = useAppRole();
  const supabaseRef = useRef(
    typeof window !== "undefined" ? createClient() : null
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState<Event[]>([]);

  useEffect(() => {
    supabaseRef.current?.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase || !canManageEvents) return;
    getEvents(supabase)
      .then((rows) =>
        setAllEvents(rows.filter((e) => !e.is_archived))
      )
      .catch(() => setAllEvents([]));
  }, [canManageEvents]);

  useEffect(() => {
    if (roleLoading) return;
    if (!canManageEvents) router.replace("/dashboard");
  }, [roleLoading, canManageEvents, router]);

  async function handleCreate(data: {
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
  }) {
    if (!userId || !supabaseRef.current)
      throw new Error("Not authenticated");
    const event = await createEvent(supabaseRef.current, {
      ...data,
      status: data.status as "idea",
      user_id: userId,
      onedrive_link: data.onedrive_link || undefined,
      event_type: data.event_type,
      planned_budget: data.planned_budget,
      actual_budget: data.actual_budget,
    });
    router.push(`/events/${event.id}`);
  }

  if (roleLoading || !canManageEvents) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-harley-orange animate-spin" />
      </div>
    );
  }

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
