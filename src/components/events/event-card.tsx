"use client";

import Link from "next/link";
import { Event } from "@/types/database";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CalendarDays, MapPin, User, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { DaysUntilEvent } from "@/components/events/days-until";

interface EventCardProps {
  event: Event;
  compact?: boolean;
  atRisk?: boolean;
}

export function EventCard({ event, compact = false, atRisk = false }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`}>
      <Card
        padding="sm"
        hover
        interactive
        className={`group ${atRisk ? "border-harley-danger/50" : ""}`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-harley-text group-hover:text-harley-orange transition-colors line-clamp-1">
            {event.name}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {atRisk && (
              <AlertTriangle className="w-4 h-4 text-harley-danger" />
            )}
            {event.is_live_mode && (
              <span className="w-2 h-2 rounded-full bg-harley-success animate-pulse" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={event.status} />
          {atRisk && <Badge variant="danger">At Risk</Badge>}
        </div>

        {!compact && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-harley-text-muted">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{format(parseISO(event.date), "MMM d, yyyy")}</span>
              </div>
              <DaysUntilEvent date={event.date} />
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-xs text-harley-text-muted">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            )}
            {event.owner && (
              <div className="flex items-center gap-2 text-xs text-harley-text-muted">
                <User className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{event.owner}</span>
              </div>
            )}
          </div>
        )}
      </Card>
    </Link>
  );
}
