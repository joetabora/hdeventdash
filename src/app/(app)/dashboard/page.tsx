import { Suspense } from "react";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { getCachedOrganizationSession } from "@/lib/app-organization-session";
import {
  getEventsForDashboard,
  getChecklistStatsForEvents,
} from "@/lib/events";
import {
  fetchDashboardAggregates,
  parseDashboardAggregatesJson,
} from "@/lib/dashboard-aggregates";
import { Loader2 } from "lucide-react";

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const { supabase, sessionOrgId } = await getCachedOrganizationSession();
  const budgetMonth = currentYearMonth();
  const active = await getEventsForDashboard(supabase);
  const [initialChecklistStats, initialAggregates] = await Promise.all([
    getChecklistStatsForEvents(
      supabase,
      active.map((e) => e.id)
    ),
    fetchDashboardAggregates(supabase, {
      budgetMonth,
      budgetLocationKey: "",
      search: "",
      locationKey: "",
      owner: "",
    }).catch((err) => {
      console.error(
        "dashboard_aggregates RPC failed (run supabase-migration-dashboard-aggregates.sql):",
        err
      );
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

  /**
   * Remount client when data or org changes (avoids stale `useState(initialEvents)`;
   * org id included so dealership switches always reset even when snapshots look similar).
   */
  const dashboardClientKey = [
    sessionOrgId ?? "",
    budgetMonth,
    checklistStatsKey,
    ...active.map((e) => `${e.id}:${e.updated_at}`),
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
        initialAggregates={initialAggregates}
      />
    </Suspense>
  );
}
