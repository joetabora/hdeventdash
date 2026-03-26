"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getEvents,
  updateEvent,
  getChecklistStatsForEvents,
  ChecklistStats,
} from "@/lib/events";
import { Event, EventStatus } from "@/types/database";
import { isEventAtRisk } from "@/lib/at-risk";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { ListView } from "@/components/dashboard/list-view";
import { Filters } from "@/components/dashboard/filters";
import { DashboardMetrics } from "@/components/dashboard/metrics";
import { RoiTrendsCard } from "@/components/dashboard/roi-trends-card";
import { Card } from "@/components/ui/card";
import { LayoutGrid, Calendar, List, Loader2 } from "lucide-react";
import { parseISO, isBefore, startOfDay } from "date-fns";
import { useAppRole } from "@/contexts/app-role-context";

type ViewType = "kanban" | "calendar" | "list";

export function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabaseRef = useRef(
    typeof window !== "undefined" ? createClient() : null
  );

  const viewParam = searchParams.get("view") as ViewType | null;
  const currentView: ViewType = viewParam || "kanban";

  const [events, setEvents] = useState<Event[]>([]);
  const [checklistStats, setChecklistStats] = useState<ChecklistStats>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const { canManageEvents } = useAppRole();

  const loadEvents = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    try {
      const data = await getEvents(supabase);
      const active = data.filter((e) => !e.is_archived);
      setEvents(active);

      const stats = await getChecklistStatsForEvents(
        supabase,
        active.map((e) => e.id)
      );
      setChecklistStats(stats);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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

  const metrics = useMemo(() => {
    const today = startOfDay(new Date());
    const upcoming = events.filter(
      (e) =>
        !isBefore(parseISO(e.date), today) &&
        e.status !== "completed"
    );

    const completions: number[] = [];
    for (const event of events) {
      const stats = checklistStats[event.id];
      if (stats && stats.total > 0) {
        completions.push((stats.completed / stats.total) * 100);
      }
    }
    const avgCompletion =
      completions.length > 0
        ? Math.round(completions.reduce((a, b) => a + b, 0) / completions.length)
        : 0;

    // Event score: weighted blend of checklist completion (70%) and
    // status progression (30%), scaled to 10
    const scores: number[] = [];
    const statusWeight: Record<string, number> = {
      idea: 0,
      planning: 0.2,
      in_progress: 0.4,
      ready_for_execution: 0.7,
      live_event: 0.9,
      completed: 1.0,
    };
    for (const event of events) {
      const stats = checklistStats[event.id];
      const checkPct = stats && stats.total > 0 ? stats.completed / stats.total : 0;
      const statusPct = statusWeight[event.status] ?? 0;
      scores.push((checkPct * 0.7 + statusPct * 0.3) * 10);
    }
    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

    return {
      upcomingCount: upcoming.length,
      atRiskCount: atRiskIds.size,
      avgCompletion,
      avgScore,
      totalEvents: events.length,
    };
  }, [events, checklistStats, atRiskIds]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !search ||
        event.name.toLowerCase().includes(search.toLowerCase()) ||
        event.description.toLowerCase().includes(search.toLowerCase());
      const matchesLocation =
        !locationFilter || event.location === locationFilter;
      const matchesOwner = !ownerFilter || event.owner === ownerFilter;
      return matchesSearch && matchesLocation && matchesOwner;
    });
  }, [events, search, locationFilter, ownerFilter]);

  async function handleStatusChange(eventId: string, newStatus: EventStatus) {
    if (!canManageEvents) return;
    const supabase = supabaseRef.current;
    if (!supabase) return;
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
    );
    try {
      await updateEvent(supabase, eventId, { status: newStatus });
    } catch {
      loadEvents();
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
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-harley-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-harley-text">Events Dashboard</h1>
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

      <DashboardMetrics
        upcomingCount={metrics.upcomingCount}
        atRiskCount={metrics.atRiskCount}
        avgCompletion={metrics.avgCompletion}
        avgScore={metrics.avgScore}
        totalEvents={metrics.totalEvents}
      />

      <Filters
        events={events}
        search={search}
        onSearchChange={setSearch}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={setOwnerFilter}
      />

      <RoiTrendsCard events={filteredEvents} />

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
        <ListView events={filteredEvents} atRiskIds={atRiskIds} />
      )}
    </div>
  );
}
