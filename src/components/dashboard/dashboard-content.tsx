"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  Calendar,
  List,
  BarChart3,
  PlusCircle,
  Download,
  CalendarPlus,
} from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChecklistStats } from "@/lib/events";
import { apiPatchEvent } from "@/lib/events-api-client";
import { Event, EventStatus } from "@/types/database";
import { isEventAtRisk } from "@/lib/at-risk";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { MobileKanban } from "@/components/dashboard/mobile-kanban";
import { downloadCsv, eventsToCsv } from "@/lib/event-csv";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { ListView } from "@/components/dashboard/list-view";
import { Filters } from "@/components/dashboard/filters";
import { DashboardMetrics } from "@/components/dashboard/metrics";
import { RoiTrendsCard } from "@/components/dashboard/roi-trends-card";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles, Button } from "@/components/ui/button";
import { useAppRole } from "@/contexts/app-role-context";
import type { DashboardAggregates } from "@/lib/dashboard-aggregates";

type ViewType = "kanban" | "calendar" | "list" | "analytics";

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const viewOptions = [
  { id: "kanban" as const, label: "Board", icon: LayoutGrid },
  { id: "calendar" as const, label: "Calendar", icon: Calendar },
  { id: "list" as const, label: "List", icon: List },
  { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
];

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
    rawView === "calendar" || rawView === "list" || rawView === "analytics"
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

  const hasFilters = !!(search.trim() || locationKeyFilter || ownerFilter);

  function clearFilters() {
    setSearch("");
    setLocationKeyFilter("");
    setOwnerFilter("");
  }

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

  function handleExportCsv() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `events-${stamp}.csv`,
      eventsToCsv(filteredEvents, checklistStats)
    );
  }

  const viewDescription =
    currentView === "analytics"
      ? "Performance, attendance, and ROI signals across active events."
      : currentView === "calendar"
        ? "Date-driven planning across every active event."
        : currentView === "list"
          ? "A compact table for scanning owners, venues, and status."
          : "Drag events through planning, execution, and completion.";

  return (
    <div className="space-y-8">
      <PageHeader
        kicker={
          currentView === "analytics"
            ? "Analytics"
            : "Event command center"
        }
        title={
          currentView === "analytics"
            ? "Analytics"
            : "Events Dashboard"
        }
        description={viewDescription}
        actions={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
            <SegmentedControl<ViewType>
              options={viewOptions}
              value={currentView}
              onChange={setView}
              className="w-full max-w-xl sm:w-auto"
            />
            {canManageEvents ? (
              <Link href="/events/new" className={buttonStyles.primary("md")}>
                <PlusCircle className="h-4 w-4" />
                New Event
              </Link>
            ) : null}
          </div>
        }
      />

      {currentView !== "analytics" && (
        <DashboardMetrics
          upcomingCount={aggregates.metrics.upcomingCount}
          atRiskCount={aggregates.metrics.atRiskCount}
          avgCompletion={aggregates.metrics.avgCompletion}
          avgScore={aggregates.metrics.avgScore}
          totalEvents={aggregates.metrics.totalEvents}
        />
      )}

      <Card padding="sm" variant="glass" className="bg-surface-overlay/72">
        <Filters
          events={events}
          search={search}
          onSearchChange={setSearch}
          locationKeyFilter={locationKeyFilter}
          onLocationKeyFilterChange={setLocationKeyFilter}
          ownerFilter={ownerFilter}
          onOwnerFilterChange={setOwnerFilter}
        />
      </Card>

      {currentView !== "analytics" && (
        <div className="-mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredEvents.length === 0}
            title="Download the events in view as a spreadsheet"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              // Content-Disposition: attachment — downloads without navigating.
              window.location.href = "/api/events/export/ics";
            }}
            title="Download all active events as a calendar file (.ics)"
          >
            <CalendarPlus className="h-4 w-4" />
            Calendar (.ics)
          </Button>
        </div>
      )}

      {currentView !== "analytics" && (
        <RoiTrendsCard trends={aggregates.filtered.roiTrends} />
      )}

      {currentView === "analytics" && (
        <AnalyticsDashboard aggregate={aggregates.filtered} />
      )}

      {currentView === "kanban" && filteredEvents.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title={hasFilters ? "No events match your filters" : "No events to show"}
          description={
            hasFilters
              ? "Try clearing filters or broadening search to bring events back on the board."
              : events.length === 0
                ? "Create your first event to populate the Kanban lanes."
                : "No events matched this view yet."
          }
          action={
            <>
              {hasFilters ? (
                <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : null}
              {canManageEvents ? (
                <Link href="/events/new" className={buttonStyles.primary("md")}>
                  <PlusCircle className="h-4 w-4" />
                  New Event
                </Link>
              ) : null}
            </>
          }
        />
      ) : null}

      {currentView === "kanban" && filteredEvents.length > 0 ? (
        <>
          <div className="hidden lg:block -mx-2 overflow-x-auto px-2">
            <KanbanBoard
              events={filteredEvents}
              onStatusChange={handleStatusChange}
              atRiskIds={atRiskIds}
              readOnly={!canManageEvents}
            />
          </div>
          <div className="lg:hidden">
            <MobileKanban
              events={filteredEvents}
              onStatusChange={handleStatusChange}
              atRiskIds={atRiskIds}
              readOnly={!canManageEvents}
            />
          </div>
        </>
      ) : null}
      {currentView === "calendar" && (
        <CalendarView events={filteredEvents} />
      )}
      {currentView === "list" && (
        <ListView
          events={filteredEvents}
          atRiskIds={atRiskIds}
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
        />
      )}
    </div>
  );
}
