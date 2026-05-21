"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { Event } from "@/types/database";
import { useAppRole } from "@/contexts/app-role-context";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { EventPlanningNotesPanel } from "@/components/events/event-detail/event-planning-notes-panel";

export function EventNotesClient({ initialEvent }: { initialEvent: Event }) {
  const router = useRouter();
  const { canManageEvents } = useAppRole();

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/events/${initialEvent.id}`}
          className={`${buttonStyles.secondary("md")} min-h-11`}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to event
        </Link>
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

        <EventPlanningNotesPanel
          key={`${initialEvent.updated_at}:${initialEvent.planning_notes ?? ""}`}
          variant="page"
          eventId={initialEvent.id}
          initialNotes={initialEvent.planning_notes ?? ""}
          canEdit={canManageEvents}
          onSaved={() => router.refresh()}
        />
      </Card>
    </div>
  );
}
