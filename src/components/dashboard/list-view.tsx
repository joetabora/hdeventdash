"use client";

import Link from "next/link";
import { Event } from "@/types/database";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { MapPin, User, ExternalLink, AlertTriangle } from "lucide-react";

interface ListViewProps {
  events: Event[];
  atRiskIds: Set<string>;
}

export function ListView({ events, atRiskIds }: ListViewProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-harley-text-muted">
        No events found. Create your first event to get started!
      </div>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-harley-gray">
              <th className="text-left px-4 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider">
                Event
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider">
                Date
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider hidden md:table-cell">
                Location
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider hidden md:table-cell">
                Owner
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-harley-gray">
            {events.map((event) => {
              const atRisk = atRiskIds.has(event.id);
              return (
                <tr
                  key={event.id}
                  className={`transition-colors ${
                    atRisk
                      ? "hover:bg-harley-danger/5 bg-harley-danger/[0.03]"
                      : "hover:bg-harley-gray/30"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {atRisk && (
                        <AlertTriangle className="w-4 h-4 text-harley-danger shrink-0" />
                      )}
                      <Link
                        href={`/events/${event.id}`}
                        className="font-medium text-harley-text hover:text-harley-orange transition-colors"
                      >
                        {event.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-harley-text-muted">
                    {format(parseISO(event.date), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-sm text-harley-text-muted hidden md:table-cell">
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-harley-text-muted hidden md:table-cell">
                    {event.owner && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {event.owner}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={event.status} />
                      {atRisk && <Badge variant="danger">At Risk</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/events/${event.id}`}
                      className="text-harley-text-muted hover:text-harley-orange"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
