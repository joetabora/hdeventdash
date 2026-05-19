"use client";

import type { OpsFeedEntryStatus, OpsFeedPriority } from "@/types/database";
import { OPS_FEED_PRIORITIES } from "@/types/database";
import { Input, Select } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export function OpsFeedFilters({
  search,
  onSearchChange,
  tag,
  onTagChange,
  priority,
  onPriorityChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  status,
  onStatusChange,
  availableTags,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  tag: string;
  onTagChange: (v: string) => void;
  priority: OpsFeedPriority | "";
  onPriorityChange: (v: OpsFeedPriority | "") => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  status: OpsFeedEntryStatus | "";
  onStatusChange: (v: OpsFeedEntryStatus | "") => void;
  availableTags: string[];
}) {
  const hasFilters =
    search.trim() ||
    tag ||
    priority ||
    dateFrom ||
    dateTo ||
    status !== "active";

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-harley-text-muted pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search notes…"
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Select
          label="Priority"
          value={priority}
          onChange={(e) =>
            onPriorityChange(e.target.value as OpsFeedPriority | "")
          }
          options={[
            { value: "", label: "All priorities" },
            ...OPS_FEED_PRIORITIES,
          ]}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) =>
            onStatusChange(e.target.value as OpsFeedEntryStatus | "")
          }
          options={[
            { value: "active", label: "Active" },
            { value: "resolved", label: "Resolved" },
            { value: "archived", label: "Archived" },
            { value: "", label: "All statuses" },
          ]}
        />
        <Input
          label="From"
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
        />
        <Input
          label="To"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
        />
      </div>

      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] uppercase tracking-wide text-harley-text-muted mr-1">
            Tags
          </span>
          {availableTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTagChange(tag === t ? "" : t)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                tag === t
                  ? "bg-harley-orange text-white"
                  : "bg-harley-gray-light/50 text-harley-text-muted hover:text-harley-text hover:bg-harley-gray-light/80"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            onSearchChange("");
            onTagChange("");
            onPriorityChange("");
            onDateFromChange("");
            onDateToChange("");
            onStatusChange("active");
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-harley-text-muted hover:text-harley-orange transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear filters
        </button>
      )}
    </div>
  );
}
