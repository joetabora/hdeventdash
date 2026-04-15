"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChecklistStats } from "@/lib/events";
import { apiPatchEvent } from "@/lib/events-api-client";
import { Event, EventStatus } from "@/types/database";
import { isEventAtRisk } from "@/lib/at-risk";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { ListView } from "@/components/dashboard/list-view";
import { Filters } from "@/components/dashboard/filters";
import { DashboardMetrics } from "@/components/dashboard/metrics";
import { RoiTrendsCard } from "@/components/dashboard/roi-trends-card";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { Card } from "@/components/ui/card";
import { LayoutGrid, Calendar, List, BarChart3 } from "lucide-react";
import { useAppRole } from "@/contexts/app-role-context";
import type { DashboardAggregates } from "@/lib/dashboard-aggregates";

type ViewType = "kanban" | "calendar" | "list" | "analytics";

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function DashboardContent({
  initialEvents,
  initialChecklistStats,
  initialAggregates,
}: {
  initialEvents: Event[];
  initialChecklistStats: ChecklistStats;
  initialAggregates: DashboardAggregates;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabaseRef = useRef(
    typeof window !== "undefined" ? getSupabaseBrowserClient() : null
  );

  const rawView = searchParams.get("view");
  const currentView: ViewType =
    rawView === "calendar" ||
    rawView === "list" ||
    rawView === "analytics"
      ? rawView
      : "kanban";

  const [search, setSearch] = useState("");
  const [locationKeyFilter, setLocationKeyFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [events, setEvents] = useState(initialEvents);
  const [checklistStats] = useState(initialChecklistStats);
  const [aggregates, setAggregates] = useState(initialAggregates);
  /** Avoid duplicate RPC right after SSR (initialAggregates already matches first filters). */
  const skipInitialAggregatesEffect = useRef(true);
  const { canManageEvents } = useAppRole();

  const refetchAggregates = useCallback(async () => {
    const params = new URLSearchParams({
      budgetMonth: currentYearMonth(),
      budgetLocationKey: locationKeyFilter,
      search: search.trim(),
      locationKey: locationKeyFilter,
      owner: ownerFilter.trim(),
    });
    try {
      const res = await fetch(`/api/dashboard/aggregates?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as DashboardAggregates;
      setAggregates(data);
    } catch {
      /* keep previous aggregates */
    }
  }, [locationKeyFilter, search, ownerFilter]);

  useEffect(() => {
    if (skipInitialAggregatesEffect.current) {
      skipInitialAggregatesEffect.current = false;
      return;
    }
    const delay = search.trim() ? 320 : 0;
    const t = setTimeout(() => {
      void refetchAggregates();
    }, delay);
    return () => clearTimeout(t);
  }, [locationKeyFilter, search, ownerFilter, refetchAggregates]);

  const atRiskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const event of events) {
      const stats = checklistStats[event.id];
      if (
        stats &&
        isEventAtRisk(event.date, event.status, stats.total, stats.completed)
      ) {
        ids.add(event.id);
      }
    }
    return ids;
  }, [events, checklistStats]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !search ||
        event.name.toLowerCase().includes(search.toLowerCase()) ||
        event.description.toLowerCase().includes(search.toLowerCase());
      const matchesLocation =
        !locationKeyFilter || event.location_key === locationKeyFilter;
      const matchesOwner = !ownerFilter || event.owner === ownerFilter;
      return matchesSearch && matchesLocation && matchesOwner;
    });
  }, [events, search, locationKeyFilter, ownerFilter]);

  async function handleStatusChange(eventId: string, newStatus: EventStatus) {
    if (!canManageEvents) return;
    const supabase = supabaseRef.current;
    if (!supabase) return;
    const previous = events;
    setEvents((old) =>
      old.map((e) =>
        e.id === eventId ? { ...e, status: newStatus } : e
      )
    );
    try {
      await apiPatchEvent(eventId, { status: newStatus });
      void refetchAggregates();
    } catch {
      setEvents(previous);
    }
  }

  function setView(view: ViewType) {
    if (view === "kanban") {
      router.push("/dashboard");
    } else {
      router.push(`/dashboard?view=${view}`);
    }
  }

  const viewButtons: { id: ViewType; label: string; icon: typeof LayoutGrid }[] = [
    { id: "kanban", label: "Kanban", icon: LayoutGrid },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "list", label: "List", icon: List },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-harley-text">
          {currentView === "analytics" ? "Analytics" : "Events Dashboard"}
        </h1>
        <Card padding="none" className="flex items-center p-1">
          {viewButtons.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentView === id
                  ? "bg-harley-orange text-white"
                  : "text-harley-text-muted hover:text-harley-text"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </Card>
      </div>

      {currentView !== "analytics" && (
        <DashboardMetrics
          upcomingCount={aggregates.metrics.upcomingCount}
          atRiskCount={aggregates.metrics.atRiskCount}
          avgCompletion={aggregates.metrics.avgCompletion}
          avgScore={aggregates.metrics.avgScore}
          totalEvents={aggregates.metrics.totalEvents}
        />
      )}

      <Filters
        events={events}
        search={search}
        onSearchChange={setSearch}
        locationKeyFilter={locationKeyFilter}
        onLocationKeyFilterChange={setLocationKeyFilter}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={setOwnerFilter}
      />

      {currentView !== "analytics" && (
        <RoiTrendsCard trends={aggregates.filtered.roiTrends} />
      )}

      {currentView === "analytics" && (
        <AnalyticsDashboard aggregate={aggregates.filtered} />
      )}

      {currentView === "kanban" && (
        <div className="overflow-x-auto -mx-2 px-2">
          <KanbanBoard
            events={filteredEvents}
            onStatusChange={handleStatusChange}
            atRiskIds={atRiskIds}
            readOnly={!canManageEvents}
          />
        </div>
      )}
      {currentView === "calendar" && (
        <CalendarView events={filteredEvents} />
      )}
      {currentView === "list" && (
        <ListView
          events={filteredEvents}
          atRiskIds={atRiskIds}
          hasFilters={!!(search || locationKeyFilter || ownerFilter)}
          onClearFilters={() => { setSearch(""); setLocationKeyFilter(""); setOwnerFilter(""); }}
        />
      )}
    </div>
  );
}
