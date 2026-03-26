import { Suspense } from "react";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { createClient } from "@/lib/supabase/server";
import {
  getEvents,
  getChecklistStatsForEvents,
} from "@/lib/events";
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
  const data = await getEvents(supabase);
  const active = data.filter((e) => !e.is_archived);
  const initialChecklistStats = await getChecklistStatsForEvents(
    supabase,
    active.map((e) => e.id)
  );
  const initialMonthlyBudgets = await getMonthlyBudgetsForMonth(
    supabase,
    budgetMonthToDbDate(budgetMonth)
  );

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-harley-orange animate-spin" />
        </div>
      }
    >
      <DashboardContent
        initialEvents={active}
        initialChecklistStats={initialChecklistStats}
        initialMonthlyBudgets={initialMonthlyBudgets}
        initialBudgetMonth={budgetMonth}
      />
    </Suspense>
  );
}
