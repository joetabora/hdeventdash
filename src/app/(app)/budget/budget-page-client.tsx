"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Event, MonthlyBudget } from "@/types/database";
import { BudgetSummaryCard } from "@/components/dashboard/budget-summary-card";
import { BudgetMonthTimeline } from "@/components/budget/budget-month-timeline";
import { normalizeLocationKey } from "@/lib/location-key";
import {
  getMonthlyBudgetsForMonth,
  budgetMonthToDbDate,
  loadMonthCapTimeline,
  type MonthCapRollup,
} from "@/lib/budgets";
import type { DashboardAggregates } from "@/lib/dashboard-aggregates";
import { useAppRole } from "@/contexts/app-role-context";
import { apiFetchJson } from "@/lib/api/api-fetch-json";
import { Filter, Wallet } from "lucide-react";
import { showError } from "@/lib/toast";

export function BudgetPageClient({
  activeOrganizationId,
  initialEvents,
  initialMonthlyBudgets,
  initialBudgetMonth,
  initialAggregates,
  initialMonthTimeline,
}: {
  activeOrganizationId: string | null;
  initialEvents: Event[];
  initialMonthlyBudgets: MonthlyBudget[];
  initialBudgetMonth: string;
  initialAggregates: DashboardAggregates;
  initialMonthTimeline: MonthCapRollup[];
}) {
  const [events] = useState(initialEvents);
  const [budgetMonth, setBudgetMonth] = useState(initialBudgetMonth);
  const [monthlyBudgets, setMonthlyBudgets] = useState(initialMonthlyBudgets);
  const [locationKeyFilter, setLocationKeyFilter] = useState("");
  const [aggregates, setAggregates] = useState(initialAggregates);
  const [monthTimeline, setMonthTimeline] =
    useState<MonthCapRollup[]>(initialMonthTimeline);
  const [copying, setCopying] = useState(false);
  const skipInitialAgg = useRef(true);
  const skipInitialBudgetMonth = useRef(true);
  const { canManageEvents } = useAppRole();

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

  const refreshTimeline = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    try {
      setMonthTimeline(
        await loadMonthCapTimeline(supabase, undefined, activeOrganizationId)
      );
    } catch {
      /* keep previous */
    }
  }, [activeOrganizationId]);

  const refetchAggregates = useCallback(async () => {
    const params = new URLSearchParams({
      budgetMonth,
      budgetLocationKey: locationKeyFilter,
      search: "",
      locationKey: locationKeyFilter,
      owner: "",
    });
    try {
      const res = await fetch(`/api/dashboard/aggregates?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as DashboardAggregates;
      setAggregates(data);
    } catch {
      /* keep previous */
    }
  }, [budgetMonth, locationKeyFilter]);

  useEffect(() => {
    if (skipInitialAgg.current) {
      skipInitialAgg.current = false;
      return;
    }
    void refetchAggregates();
  }, [budgetMonth, locationKeyFilter, refetchAggregates]);

  useEffect(() => {
    if (skipInitialBudgetMonth.current) {
      skipInitialBudgetMonth.current = false;
      return;
    }
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      try {
        const rows = await getMonthlyBudgetsForMonth(
          supabase,
          budgetMonthToDbDate(budgetMonth),
          activeOrganizationId
        );
        setMonthlyBudgets(rows);
      } catch {
        setMonthlyBudgets([]);
      }
    })();
  }, [budgetMonth, activeOrganizationId]);

  async function reloadMonthlyBudgetsForPickerMonth() {
    const supabase = getSupabaseBrowserClient();
    try {
      setMonthlyBudgets(
        await getMonthlyBudgetsForMonth(
          supabase,
          budgetMonthToDbDate(budgetMonth),
          activeOrganizationId
        )
      );
    } catch {
      setMonthlyBudgets([]);
    }
  }

  async function handleBudgetsChanged() {
    await reloadMonthlyBudgetsForPickerMonth();
    await refreshTimeline();
  }

  async function handleCopyPrevious() {
    setCopying(true);
    try {
      await apiFetchJson<{ ok: boolean; copied: number }>(
        "/api/budgets/copy-previous",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetMonth: budgetMonthToDbDate(budgetMonth),
          }),
        }
      );
      await handleBudgetsChanged();
      void refetchAggregates();
    } catch (e) {
      console.error(e);
      showError("Failed to copy previous month's budgets.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Wallet className="w-7 h-7 text-harley-orange shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-harley-text">Budget</h1>
            <p className="text-sm text-harley-text-muted mt-0.5">
              Monthly caps, planned spend by venue, and utilization.
            </p>
          </div>
        </div>
      </div>

      <BudgetMonthTimeline
        timeline={monthTimeline}
        selectedYearMonth={budgetMonth}
        onSelectMonth={setBudgetMonth}
        canManage={canManageEvents}
        copying={copying}
        onCopyPrevious={handleCopyPrevious}
      />

      {locationOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-harley-text-muted shrink-0" />
          <label className="text-sm text-harley-text-muted sr-only">
            Filter by location
          </label>
          <select
            value={locationKeyFilter}
            onChange={(e) => setLocationKeyFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-sm focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150"
          >
            <option value="">All locations</option>
            {locationOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      <BudgetSummaryCard
        events={events}
        plannedSpend={aggregates.budget.plannedSpend}
        monthlyBudgets={monthlyBudgets}
        budgetMonth={budgetMonth}
        onBudgetMonthChange={setBudgetMonth}
        locationKeyFilter={locationKeyFilter}
        canManageBudgets={canManageEvents}
        onBudgetsUpdated={() => void handleBudgetsChanged()}
        planningMode
      />
    </div>
  );
}
