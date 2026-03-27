import { Suspense } from "react";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { createClient } from "@/lib/supabase/server";
import {
  getEventsForDashboard,
  getChecklistStatsForEvents,
} from "@/lib/events";
import {
  fetchDashboardAggregates,
  parseDashboardAggregatesJson,
} from "@/lib/dashboard-aggregates";
import {
  getMonthlyBudgetsForMonth,
  budgetMonthToDbDate,
} from "@/lib/budgets";
import { Loader2 } from "lucide-react";

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const budgetMonth = currentYearMonth();
  const active = await getEventsForDashboard(supabase);
  const [initialChecklistStats, initialMonthlyBudgets, initialAggregates] =
    await Promise.all([
      getChecklistStatsForEvents(
        supabase,
        active.map((e) => e.id)
      ),
      getMonthlyBudgetsForMonth(supabase, budgetMonthToDbDate(budgetMonth)),
      fetchDashboardAggregates(supabase, {
        budgetMonth,
        budgetLocationKey: "",
        search: "",
        locationKey: "",
        owner: "",
      }).catch((err) => {
        console.error("dashboard_aggregates RPC failed (run supabase-migration-dashboard-aggregates.sql):", err);
        return parseDashboardAggregatesJson({});
      }),
    ]);

  const checklistStatsKey = active
    .map((e) => {
      const s = initialChecklistStats[e.id];
      return `${e.id}:${s?.completed ?? 0}/${s?.total ?? 0}`;
    })
    .sort()
    .join("|");

  /** Remount client when server snapshot changes (e.g. router.refresh) without prop→state effects. */
  const dashboardClientKey = [
    budgetMonth,
    checklistStatsKey,
    ...active.map((e) => `${e.id}:${e.updated_at}`),
    ...initialMonthlyBudgets.map((b) => `${b.id}:${b.updated_at}`),
  ].join("\u0001");

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-harley-orange animate-spin" />
        </div>
      }
    >
      <DashboardContent
        key={dashboardClientKey}
        initialEvents={active}
        initialChecklistStats={initialChecklistStats}
        initialMonthlyBudgets={initialMonthlyBudgets}
        initialBudgetMonth={budgetMonth}
        initialAggregates={initialAggregates}
      />
    </Suspense>
  );
}
