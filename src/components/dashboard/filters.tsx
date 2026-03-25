"use client";

import { useMemo } from "react";
import { Event } from "@/types/database";
import { Search, Filter } from "lucide-react";

interface FiltersProps {
  events: Event[];
  search: string;
  onSearchChange: (value: string) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  ownerFilter: string;
  onOwnerFilterChange: (value: string) => void;
}

export function Filters({
  events,
  search,
  onSearchChange,
  locationFilter,
  onLocationFilterChange,
  ownerFilter,
  onOwnerFilterChange,
}: FiltersProps) {
  const locations = useMemo(() => {
    const set = new Set(events.map((e) => e.location).filter(Boolean));
    return Array.from(set).sort();
  }, [events]);

  const owners = useMemo(() => {
    const set = new Set(events.map((e) => e.owner).filter(Boolean));
    return Array.from(set).sort();
  }, [events]);

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-harley-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-harley-gray border border-harley-gray-lighter text-harley-text placeholder-harley-text-muted focus:outline-none focus:border-harley-orange transition-colors text-sm"
        />
      </div>

      {locations.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-harley-text-muted" />
          <select
            value={locationFilter}
            onChange={(e) => onLocationFilterChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-harley-gray border border-harley-gray-lighter text-harley-text text-sm focus:outline-none focus:border-harley-orange transition-colors"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      )}

      {owners.length > 0 && (
        <select
          value={ownerFilter}
          onChange={(e) => onOwnerFilterChange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-harley-gray border border-harley-gray-lighter text-harley-text text-sm focus:outline-none focus:border-harley-orange transition-colors"
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
