import { addMonths, format, parseISO, subMonths } from "date-fns";
import { SupabaseClient } from "@supabase/supabase-js";
import { Event, MonthlyBudget } from "@/types/database";
import { normalizeLocationKey } from "@/lib/location-key";

/** Sum optional checklist line estimates for one event (live checklist state). */
export function sumChecklistEstimatedCost(
  items: readonly { estimated_cost?: number | null }[]
): number {
  let s = 0;
  for (const i of items) {
    if (i.estimated_cost == null) continue;
    s += Number(i.estimated_cost) || 0;
  }
  return s;
}

/** Months shown on the Budget page planning strip (including current). */
export const BUDGET_PLANNING_MONTH_COUNT = 24;

export type MonthCapRollup = {
  /** `YYYY-MM` */
  yearMonth: string;
  totalCap: number;
  venueCount: number;
};

export function planningRangeFromCurrentMonth(now: Date = new Date()): {
  startYm: string;
  startFirstDay: string;
  endFirstDay: string;
} {
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  const startYm = format(d, "yyyy-MM");
  const startFirstDay = format(d, "yyyy-MM-dd");
  const endD = addMonths(d, BUDGET_PLANNING_MONTH_COUNT - 1);
  const endFirstDay = format(endD, "yyyy-MM-dd");
  return { startYm, startFirstDay, endFirstDay };
}

/** Aggregate DB rows by calendar month (`YYYY-MM`). */
export function rollupBudgetAmountsByMonth(
  rows: readonly { month: string; budget_amount: number | string | null }[]
): Map<string, { totalCap: number; venueCount: number }> {
  const map = new Map<string, { totalCap: number; venueCount: number }>();
  for (const row of rows) {
    const ym = String(row.month).slice(0, 7);
    const cur = map.get(ym) ?? { totalCap: 0, venueCount: 0 };
    cur.totalCap += Number(row.budget_amount) || 0;
    cur.venueCount += 1;
    map.set(ym, cur);
  }
  return map;
}

export function buildMonthCapTimeline(
  startYearMonth: string,
  monthCount: number,
  rollup: Map<string, { totalCap: number; venueCount: number }>
): MonthCapRollup[] {
  const start = parseISO(`${startYearMonth.slice(0, 7)}-01`);
  const out: MonthCapRollup[] = [];
  for (let i = 0; i < monthCount; i++) {
    const d = addMonths(start, i);
    const ym = format(d, "yyyy-MM");
    const r = rollup.get(ym);
    out.push({
      yearMonth: ym,
      totalCap: r?.totalCap ?? 0,
      venueCount: r?.venueCount ?? 0,
    });
  }
  return out;
}

export async function fetchMonthlyBudgetAmountRowsInRange(
  supabase: SupabaseClient,
  startFirstDay: string,
  endFirstDay: string
): Promise<{ month: string; budget_amount: number }[]> {
  const { data, error } = await supabase
    .from("monthly_budgets")
    .select("month, budget_amount")
    .gte("month", startFirstDay)
    .lte("month", endFirstDay);
  if (error) throw error;
  return (data ?? []) as { month: string; budget_amount: number }[];
}

export async function loadMonthCapTimeline(
  supabase: SupabaseClient,
  now?: Date
): Promise<MonthCapRollup[]> {
  const { startYm, startFirstDay, endFirstDay } = planningRangeFromCurrentMonth(now);
  /** Include prior month so "copy from previous" eligibility works for the first chip. */
  const rangeStart = format(subMonths(parseISO(startFirstDay), 1), "yyyy-MM-dd");
  const rows = await fetchMonthlyBudgetAmountRowsInRange(
    supabase,
    rangeStart,
    endFirstDay
  );
  return buildMonthCapTimeline(
    startYm,
    BUDGET_PLANNING_MONTH_COUNT,
    rollupBudgetAmountsByMonth(rows)
  );
}

/** Minimal event row for monthly planned-budget aggregation (same org, one calendar month). */
export type EventBudgetPeer = Pick<
  Event,
  "id" | "date" | "location" | "location_key" | "planned_budget" | "is_archived"
> & {
  /** Sum of checklist item estimated_cost for this event (from DB). */
  checklist_estimated_total: number;
};

/** Planned budget + optional checklist line-item estimates (monthly cap math). */
export function eventBudgetPeerCommittedSpend(e: EventBudgetPeer): number {
  return (
    (Number(e.planned_budget) || 0) +
    (Number(e.checklist_estimated_total) || 0)
  );
}

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

/**
 * Copy all venue caps from the calendar month before `targetMonthFirstDay` into the target month (upsert).
 * @returns number of rows written
 */
export async function copyPreviousMonthBudgets(
  supabase: SupabaseClient,
  targetMonthFirstDay: string
): Promise<number> {
  const normalized = budgetMonthToDbDate(targetMonthFirstDay.slice(0, 7));
  const target = parseISO(normalized);
  if (Number.isNaN(target.getTime())) {
    throw new Error("Invalid target month");
  }
  const prev = addMonths(target, -1);
  const prevStr = format(prev, "yyyy-MM-dd");
  const { data: rows, error } = await supabase
    .from("monthly_budgets")
    .select("location, budget_amount")
    .eq("month", prevStr);
  if (error) throw error;
  let n = 0;
  for (const r of rows ?? []) {
    const loc = String(r.location ?? "").trim();
    if (!loc) continue;
    await upsertMonthlyBudget(supabase, {
      month: normalized,
      location: loc,
      budget_amount: Number(r.budget_amount) || 0,
    });
    n += 1;
  }
  return n;
}

export async function deleteMonthlyBudget(
  supabase: SupabaseClient,
  id: string
) {
  const { error } = await supabase.from("monthly_budgets").delete().eq("id", id);
  if (error) throw error;
}

/** Sum planned_budget + checklist estimated_cost for events in yearMonth, optional location_key match. */
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
    sum += eventBudgetPeerCommittedSpend(e);
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

/** Sum every venue cap row for the month (same rows as Budget page for that period). */
export function sumMonthlyBudgetRows(budgets: readonly MonthlyBudget[]): number {
  return budgets.reduce((s, b) => s + (Number(b.budget_amount) || 0), 0);
}

/**
 * Monthly cap for an event: exact venue match (or combined if event has no venue key),
 * then if there is exactly one budget row for that month, use it anyway (single-store orgs
 * where event location text may not match the Budget row label). With multiple rows and no
 * key match, returns 0 so callers can show a venue mismatch hint.
 */
export function effectiveMonthlyCapForEvent(
  budgets: readonly MonthlyBudget[],
  eventLocationKey: string
): number {
  const key = (eventLocationKey || "").trim();
  const matched = totalMonthlyBudgetCapacity(budgets as MonthlyBudget[], key);
  if (matched > 0) return matched;
  if (budgets.length === 1) {
    return Number(budgets[0].budget_amount) || 0;
  }
  return 0;
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
    sum += eventBudgetPeerCommittedSpend(e);
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
