"use client";

import { useMemo } from "react";
import { Event } from "@/types/database";
import { normalizeLocationKey } from "@/lib/location-key";
import { Search, Filter } from "lucide-react";

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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-harley-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events..."
          className="w-full rounded-lg border border-harley-gray-lighter/50 bg-harley-black/28 py-2.5 pl-10 pr-4 text-sm text-harley-text placeholder-harley-text-muted/60 transition-all duration-150 focus:border-harley-orange/70 focus:outline-none focus:ring-1 focus:ring-harley-orange/20"
        />
      </div>

      {locationOptions.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-harley-text-muted" />
          <select
            value={locationKeyFilter}
            onChange={(e) => onLocationKeyFilterChange(e.target.value)}
            className="rounded-lg border border-harley-gray-lighter/50 bg-harley-black/28 px-3 py-2.5 text-sm text-harley-text transition-all duration-150 focus:border-harley-orange/70 focus:outline-none focus:ring-1 focus:ring-harley-orange/20"
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
          className="rounded-lg border border-harley-gray-lighter/50 bg-harley-black/28 px-3 py-2.5 text-sm text-harley-text transition-all duration-150 focus:border-harley-orange/70 focus:outline-none focus:ring-1 focus:ring-harley-orange/20"
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
