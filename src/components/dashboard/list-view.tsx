"use client";

import Link from "next/link";
import { Event } from "@/types/database";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, buttonStyles } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { MapPin, User, ExternalLink, AlertTriangle, LayoutList } from "lucide-react";

interface ListViewProps {
  events: Event[];
  atRiskIds: Set<string>;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function ListView({ events, atRiskIds, hasFilters, onClearFilters }: ListViewProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={LayoutList}
        title={
          hasFilters ? "No events match your filters" : "No events found"
        }
        description={
          hasFilters ? (
            "Adjust search or filters—or clear them—to see matching events."
          ) : (
            "Create your first event to populate the roster and timelines."
          )
        }
        action={
          hasFilters && onClearFilters ? (
            <Button type="button" variant="secondary" size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : (
            <Link href="/events/new" className={buttonStyles.primary("md")}>
              Create event
            </Link>
          )
        }
      />
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-base/55">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-harley-text-muted">
                Event
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-harley-text-muted">
                Date
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-harley-text-muted md:table-cell">
                Location
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-harley-text-muted md:table-cell">
                Owner
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-harley-text-muted">
                Status
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/80">
            {events.map((event) => {
              const atRisk = atRiskIds.has(event.id);

              let dateLabel = "—";
              try {
                dateLabel = format(parseISO(event.date), "MMM d, yyyy");
              } catch {
                /* invalid date strings fall back silently */
              }

              return (
                <tr
                  key={event.id}
                  className={
                    atRisk
                      ? "bg-harley-danger/[0.04] transition-colors hover:bg-harley-danger/[0.07]"
                      : "transition-colors hover:bg-surface-overlay/54"
                  }
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {atRisk ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-harley-danger" aria-hidden />
                      ) : null}
                      <Link
                        href={`/events/${event.id}`}
                        className="font-medium text-harley-text transition-colors hover:text-harley-orange"
                      >
                        {event.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-harley-text-muted">
                    {dateLabel}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-harley-text-muted md:table-cell">
                    {event.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {event.location}
                      </span>
                    ) : null}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-harley-text-muted md:table-cell">
                    {event.owner ? (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {event.owner}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={event.status} />
                      {atRisk ? <Badge variant="danger">At Risk</Badge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/events/${event.id}`}
                      className="inline-flex text-harley-text-muted transition-colors hover:text-harley-orange"
                      aria-label={`Open ${event.name}`}
                    >
                      <ExternalLink className="h-4 w-4" />
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
