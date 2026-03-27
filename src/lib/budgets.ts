import { SupabaseClient } from "@supabase/supabase-js";
import { Event, MonthlyBudget } from "@/types/database";
import { normalizeLocationKey } from "@/lib/location-key";

/** Minimal event row for monthly planned-budget aggregation (same org, one calendar month). */
export type EventBudgetPeer = Pick<
  Event,
  "id" | "date" | "location" | "location_key" | "planned_budget" | "is_archived"
>;

/** First calendar day of the month after `yearMonth` (`YYYY-MM`). */
export function firstDayOfNextCalendarMonth(yearMonth: string): string {
  const ym = yearMonth.slice(0, 7);
  const [ys, ms] = ym.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return `${ym}-01`;
  }
  if (m === 12) return `${y + 1}-01-01`;
  return `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

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
    .order("location_key", { ascending: true })
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
  const location = payload.location.trim();
  const location_key = normalizeLocationKey(location);
  const { data, error } = await supabase
    .from("monthly_budgets")
    .upsert(
      {
        month: payload.month,
        location,
        location_key,
        budget_amount: payload.budget_amount,
      },
      { onConflict: "organization_id,month,location_key" }
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

/** Sum planned_budget for events whose date falls in yearMonth, optional location_key match. */
export function sumPlannedBudgetForMonth(
  events: readonly EventBudgetPeer[],
  yearMonth: string,
  locationKeyFilter: string
): number {
  let sum = 0;
  for (const e of events) {
    if (e.is_archived) continue;
    if (eventDateToYearMonth(e.date) !== yearMonth) continue;
    const key = e.location_key ?? normalizeLocationKey(e.location);
    if (locationKeyFilter && key !== locationKeyFilter) continue;
    sum += Number(e.planned_budget) || 0;
  }
  return sum;
}

export function totalMonthlyBudgetCapacity(
  budgets: MonthlyBudget[],
  locationKeyFilter: string
): number {
  if (locationKeyFilter) {
    const row = budgets.find((b) => b.location_key === locationKeyFilter);
    return row ? Number(row.budget_amount) || 0 : 0;
  }
  return budgets.reduce((s, b) => s + (Number(b.budget_amount) || 0), 0);
}

/**
 * Sum planned budgets for other events in the same calendar month.
 * Matches dashboard rules: if `eventLocationKey` is set, only events at that location_key; otherwise all events in the month.
 */
export function sumOthersPlannedForMonth(
  events: readonly EventBudgetPeer[],
  yearMonth: string,
  eventLocationKey: string,
  excludeEventId?: string
): number {
  let sum = 0;
  for (const e of events) {
    if (e.is_archived) continue;
    if (eventDateToYearMonth(e.date) !== yearMonth) continue;
    if (excludeEventId && e.id === excludeEventId) continue;
    const key = e.location_key ?? normalizeLocationKey(e.location);
    if (eventLocationKey && key !== eventLocationKey) continue;
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
