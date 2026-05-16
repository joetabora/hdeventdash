import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  getEventsForDashboard,
} from "@/lib/events";
import {
  fetchDashboardAggregates,
  parseDashboardAggregatesJson,
} from "@/lib/dashboard-aggregates";
import {
  getMonthlyBudgetsForMonth,
  budgetMonthToDbDate,
  loadMonthCapTimeline,
} from "@/lib/budgets";
import { getSessionOrganizationId } from "@/lib/organization-server";
import { BudgetPageClient } from "./budget-page-client";
import { Loader2 } from "lucide-react";

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function BudgetPage() {
  const supabase = await createClient();
  const orgId = await getSessionOrganizationId(supabase);
  const budgetMonth = currentYearMonth();
  const active = await getEventsForDashboard(supabase);
  const [initialMonthlyBudgets, initialAggregates, initialMonthTimeline] =
    await Promise.all([
      getMonthlyBudgetsForMonth(
        supabase,
        budgetMonthToDbDate(budgetMonth),
        orgId
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
      loadMonthCapTimeline(supabase, undefined, orgId),
    ]);

  const budgetClientKey = [
    orgId ?? "",
    budgetMonth,
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
      <BudgetPageClient
        key={budgetClientKey}
        activeOrganizationId={orgId}
        initialEvents={active}
        initialMonthlyBudgets={initialMonthlyBudgets}
        initialBudgetMonth={budgetMonth}
        initialAggregates={initialAggregates}
        initialMonthTimeline={initialMonthTimeline}
      />
    </Suspense>
  );
}
