import { SupabaseClient } from "@supabase/supabase-js";
import { Event, MonthlyBudget } from "@/types/database";

/** `YYYY-MM` → `YYYY-MM-01` for DB month column */
export function budgetMonthToDbDate(yearMonth: string): string {
  if (!yearMonth || yearMonth.length < 7) return yearMonth;
  return `${yearMonth.slice(0, 7)}-01`;
}

/** Event `date` → `YYYY-MM` */
export function eventDateToYearMonth(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export async function getMonthlyBudgetsForMonth(
  supabase: SupabaseClient,
  monthFirstDay: string
): Promise<MonthlyBudget[]> {
  const { data, error } = await supabase
    .from("monthly_budgets")
    .select("*")
    .eq("month", monthFirstDay)
    .order("location", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MonthlyBudget[];
}

export async function upsertMonthlyBudget(
  supabase: SupabaseClient,
  payload: {
    month: string;
    location: string;
    budget_amount: number;
  }
): Promise<MonthlyBudget> {
  const { data, error } = await supabase
    .from("monthly_budgets")
    .upsert(
      {
        month: payload.month,
        location: payload.location.trim(),
        budget_amount: payload.budget_amount,
      },
      { onConflict: "organization_id,month,location" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as MonthlyBudget;
}

export async function deleteMonthlyBudget(
  supabase: SupabaseClient,
  id: string
) {
  const { error } = await supabase.from("monthly_budgets").delete().eq("id", id);
  if (error) throw error;
}

/** Sum planned_budget for events whose date falls in yearMonth, optional exact location match. */
export function sumPlannedBudgetForMonth(
  events: Event[],
  yearMonth: string,
  locationFilter: string
): number {
  let sum = 0;
  for (const e of events) {
    if (e.is_archived) continue;
    if (eventDateToYearMonth(e.date) !== yearMonth) continue;
    if (locationFilter && e.location !== locationFilter) continue;
    sum += Number(e.planned_budget) || 0;
  }
  return sum;
}

export function totalMonthlyBudgetCapacity(
  budgets: MonthlyBudget[],
  locationFilter: string
): number {
  if (locationFilter) {
    const row = budgets.find((b) => b.location === locationFilter);
    return row ? Number(row.budget_amount) || 0 : 0;
  }
  return budgets.reduce((s, b) => s + (Number(b.budget_amount) || 0), 0);
}

/**
 * Sum planned budgets for other events in the same calendar month.
 * Matches dashboard rules: if `eventLocation` is set, only events at that location; otherwise all events in the month.
 */
export function sumOthersPlannedForMonth(
  events: Event[],
  yearMonth: string,
  eventLocationTrimmed: string,
  excludeEventId?: string
): number {
  let sum = 0;
  for (const e of events) {
    if (e.is_archived) continue;
    if (eventDateToYearMonth(e.date) !== yearMonth) continue;
    if (excludeEventId && e.id === excludeEventId) continue;
    if (eventLocationTrimmed && e.location !== eventLocationTrimmed) continue;
    sum += Number(e.planned_budget) || 0;
  }
  return sum;
}

/**
 * Dashboard budget card:
 * - Under 70% → neutral
 * - 70–90% → warning
 * - Above 90% up to 100% → warning (still at risk before cap)
 * - Over 100% → danger
 */
export type BudgetCardStatus = "neutral" | "warning" | "danger" | "no_budget";

export function budgetPercentUsed(plannedTotal: number, monthlyCap: number): number {
  if (monthlyCap <= 0) return 0;
  return (plannedTotal / monthlyCap) * 100;
}

export function budgetCardStatus(
  plannedTotal: number,
  monthlyCap: number
): BudgetCardStatus {
  if (monthlyCap <= 0) return "no_budget";
  const pct = budgetPercentUsed(plannedTotal, monthlyCap);
  if (pct > 100) return "danger";
  if (pct >= 70) return "warning";
  return "neutral";
}
