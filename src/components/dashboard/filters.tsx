"use client";

import { useMemo } from "react";
import { Search, Filter } from "lucide-react";

import { baseInputClassName } from "@/components/ui/input";
import { Event } from "@/types/database";
import { normalizeLocationKey } from "@/lib/location-key";
import { cn } from "@/lib/cn";

interface FiltersProps {
  events: Event[];
  search: string;
  onSearchChange: (value: string) => void;
  /** Canonical venue key; empty = all */
  locationKeyFilter: string;
  onLocationKeyFilterChange: (value: string) => void;
  ownerFilter: string;
  onOwnerFilterChange: (value: string) => void;
}

export function Filters({
  events,
  search,
  onSearchChange,
  locationKeyFilter,
  onLocationKeyFilterChange,
  ownerFilter,
  onOwnerFilterChange,
}: FiltersProps) {
  const locationOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of events) {
      const key = e.location_key || normalizeLocationKey(e.location);
      if (!key) continue;
      if (!map.has(key)) map.set(key, e.location.trim() || key);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], undefined, { sensitivity: "base" })
    );
  }, [events]);

  const owners = useMemo(() => {
    const set = new Set(events.map((e) => e.owner).filter(Boolean));
    return Array.from(set).sort();
  }, [events]);

  const selectClass = cn(baseInputClassName, "py-2.5 text-sm");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-harley-text-muted"
          aria-hidden
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events..."
          className={cn(baseInputClassName, "py-2.5 pl-10 text-sm")}
        />
      </div>

      {locationOptions.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 shrink-0 text-harley-text-muted" aria-hidden />
          <select
            value={locationKeyFilter}
            onChange={(e) => onLocationKeyFilterChange(e.target.value)}
            className={selectClass}
          >
            <option value="">All Locations</option>
            {locationOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {owners.length > 0 && (
        <select
          value={ownerFilter}
          onChange={(e) => onOwnerFilterChange(e.target.value)}
          className={selectClass}
        >
          <option value="">All Owners</option>
          {owners.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
