"use client";

import { useMemo, useState, useLayoutEffect, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChecklistStats } from "@/lib/events";
import { apiPatchEvent } from "@/lib/events-api-client";
import { Event, EventStatus, MonthlyBudget } from "@/types/database";
import { isEventAtRisk } from "@/lib/at-risk";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { ListView } from "@/components/dashboard/list-view";
import { Filters } from "@/components/dashboard/filters";
import { DashboardMetrics } from "@/components/dashboard/metrics";
import { BudgetSummaryCard } from "@/components/dashboard/budget-summary-card";
import { RoiTrendsCard } from "@/components/dashboard/roi-trends-card";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { Card } from "@/components/ui/card";
import { LayoutGrid, Calendar, List, BarChart3 } from "lucide-react";
import { parseISO, isBefore, startOfDay } from "date-fns";
import { useAppRole } from "@/contexts/app-role-context";
import { getMonthlyBudgetsForMonth, budgetMonthToDbDate } from "@/lib/budgets";

type ViewType = "kanban" | "calendar" | "list" | "analytics";

export function DashboardContent({
  initialEvents,
  initialChecklistStats,
  initialMonthlyBudgets,
  initialBudgetMonth,
}: {
  initialEvents: Event[];
  initialChecklistStats: ChecklistStats;
  initialMonthlyBudgets: MonthlyBudget[];
  initialBudgetMonth: string;
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
  const [budgetMonth, setBudgetMonth] = useState(initialBudgetMonth);
  const [events, setEvents] = useState(initialEvents);
  const [checklistStats, setChecklistStats] = useState(initialChecklistStats);
  const [monthlyBudgets, setMonthlyBudgets] = useState(initialMonthlyBudgets);
  const skipNextBudgetFetch = useRef(false);
  const { canManageEvents } = useAppRole();

  /* eslint-disable react-hooks/set-state-in-effect -- RSC props → client state on navigation/refresh */
  useLayoutEffect(() => {
    setEvents(initialEvents);
    setChecklistStats(initialChecklistStats);
    setMonthlyBudgets(initialMonthlyBudgets);
    setBudgetMonth(initialBudgetMonth);
    skipNextBudgetFetch.current = true;
  }, [
    initialEvents,
    initialChecklistStats,
    initialMonthlyBudgets,
    initialBudgetMonth,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (skipNextBudgetFetch.current) {
      skipNextBudgetFetch.current = false;
      return;
    }
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      try {
        const rows = await getMonthlyBudgetsForMonth(
          supabase,
          budgetMonthToDbDate(budgetMonth)
        );
        setMonthlyBudgets(rows);
      } catch {
        setMonthlyBudgets([]);
      }
    })();
  }, [budgetMonth]);

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
        !locationKeyFilter || event.location_key === locationKeyFilter;
      const matchesOwner = !ownerFilter || event.owner === ownerFilter;
      return matchesSearch && matchesLocation && matchesOwner;
    });
  }, [events, search, locationKeyFilter, ownerFilter]);

  async function reloadMonthlyBudgetsForPickerMonth() {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    try {
      setMonthlyBudgets(
        await getMonthlyBudgetsForMonth(
          supabase,
          budgetMonthToDbDate(budgetMonth)
        )
      );
    } catch {
      setMonthlyBudgets([]);
    }
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
          upcomingCount={metrics.upcomingCount}
          atRiskCount={metrics.atRiskCount}
          avgCompletion={metrics.avgCompletion}
          avgScore={metrics.avgScore}
          totalEvents={metrics.totalEvents}
        />
      )}

      <BudgetSummaryCard
        events={events}
        monthlyBudgets={monthlyBudgets}
        budgetMonth={budgetMonth}
        onBudgetMonthChange={setBudgetMonth}
        locationKeyFilter={locationKeyFilter}
        canManageBudgets={canManageEvents}
        onBudgetsUpdated={() => void reloadMonthlyBudgetsForPickerMonth()}
      />

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
        <RoiTrendsCard events={filteredEvents} />
      )}

      {currentView === "analytics" && (
        <AnalyticsDashboard
          events={filteredEvents}
          checklistStats={checklistStats}
        />
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
        <ListView events={filteredEvents} atRiskIds={atRiskIds} />
      )}
    </div>
  );
}
