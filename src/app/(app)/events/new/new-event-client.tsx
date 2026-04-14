"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { apiCreateEvent } from "@/lib/events-api-client";
import { apiFetchJson } from "@/lib/api/api-fetch-json";
import { EventForm } from "@/components/events/event-form";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { EventBudgetPeer } from "@/lib/budgets";
import type { EventStatus, EventType } from "@/types/database";

export function NewEventClient({
  initialBudgetPeers,
}: {
  initialBudgetPeers: EventBudgetPeer[];
}) {
  const router = useRouter();
  const [budgetPeers, setBudgetPeers] = useState(initialBudgetPeers);

  const onBudgetPeersMonthChange = useCallback((yearMonth: string) => {
    void (async () => {
      try {
        const data = await apiFetchJson<{ events: EventBudgetPeer[] }>(
          `/api/events/budget-context?month=${encodeURIComponent(yearMonth)}`
        );
        setBudgetPeers(data.events);
      } catch {
        setBudgetPeers([]);
      }
    })();
  }, []);

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
      event_goals: string | null;
      core_activities: string | null;
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
        event_goals: data.event_goals,
        core_activities: data.core_activities,
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
          allEvents={budgetPeers}
          onBudgetPeersMonthChange={onBudgetPeersMonthChange}
          onSubmit={handleCreate}
          onCancel={() => router.push("/dashboard")}
        />
      </Card>
    </div>
  );
}
