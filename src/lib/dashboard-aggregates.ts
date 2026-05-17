import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventType } from "@/types/database";
import type { Event } from "@/types/database";
import { getDashboardEventDateBounds } from "@/lib/events";
import { eventTypeLabel } from "@/lib/analytics";
import { normalizeLocationKey } from "@/lib/location-key";

export interface DashboardBudgetAggregate {
  plannedSpend: number;
  monthlyCap: number;
}

export interface DashboardMetricsAggregate {
  upcomingCount: number;
  atRiskCount: number;
  avgCompletion: number;
  avgScore: number;
  totalEvents: number;
}

export interface DashboardPerformanceSnapshot {
  totalRevenue: number;
  eventsWithRevenue: number;
  avgAttendance: number | null;
  eventsWithAttendance: number;
  avgChecklistCompletion: number | null;
  eventCount: number;
}

export interface DashboardAttendancePoint {
  id: string;
  name: string;
  date: string;
  attendance: number;
}

export interface DashboardEventTypeRow {
  key: string;
  label: string;
  count: number;
  avgRevenue: number;
  totalRevenue: number;
  avgAttendance: number | null;
  avgChecklistCompletion: number | null;
}

export interface DashboardRoiTrends {
  rows: { id: string; name: string; date: string; revenue: number }[];
  runningTotals: { id: string; running: number }[];
  totalTracked: number;
  maxRev: number;
  maxRunning: number;
}

export interface DashboardAggregates {
  budget: DashboardBudgetAggregate;
  metrics: DashboardMetricsAggregate;
  filtered: {
    snapshot: DashboardPerformanceSnapshot;
    attendanceSeries: DashboardAttendancePoint[];
    byEventType: DashboardEventTypeRow[];
    roiTrends: DashboardRoiTrends;
  };
}

const EMPTY_ROI: DashboardRoiTrends = {
  rows: [],
  runningTotals: [],
  totalTracked: 0,
  maxRev: 1,
  maxRunning: 1,
};

function num(n: unknown, fallback = 0): number {
  if (n === null || n === undefined) return fallback;
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function parseRoiTrends(raw: Record<string, unknown> | null | undefined): DashboardRoiTrends {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ROI };
  const rowsIn = Array.isArray(raw.rows) ? raw.rows : [];
  const runIn = Array.isArray(raw.running_totals) ? raw.running_totals : [];
  return {
    rows: rowsIn.map((r) => {
      const o = r as Record<string, unknown>;
      return {
        id: String(o.id ?? ""),
        name: String(o.name ?? ""),
        date: String(o.date ?? ""),
        revenue: num(o.revenue),
      };
    }),
    runningTotals: runIn.map((r) => {
      const o = r as Record<string, unknown>;
      return { id: String(o.id ?? ""), running: num(o.running) };
    }),
    totalTracked: num(raw.total_tracked),
    maxRev: Math.max(num(raw.max_rev, 1), 1),
    maxRunning: Math.max(num(raw.max_running, 1), 1),
  };
}

function typeRowLabel(key: string): string {
  if (key === "__uncategorized__") return "Uncategorized";
  return eventTypeLabel(key as EventType);
}

/** Normalize RPC jsonb into dashboard-friendly shapes. */
export function parseDashboardAggregatesJson(data: unknown): DashboardAggregates {
  const root = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  const budget = (root.budget && typeof root.budget === "object"
    ? root.budget
    : {}) as Record<string, unknown>;
  const metrics = (root.metrics && typeof root.metrics === "object"
    ? root.metrics
    : {}) as Record<string, unknown>;
  const filtered = (root.filtered && typeof root.filtered === "object"
    ? root.filtered
    : {}) as Record<string, unknown>;
  const snapshot = (filtered.snapshot && typeof filtered.snapshot === "object"
    ? filtered.snapshot
    : {}) as Record<string, unknown>;
  const attendanceRaw = filtered.attendance_series;
  const typeRaw = filtered.by_event_type;
  const roiRaw = filtered.roi_trends;

  const attendanceSeries: DashboardAttendancePoint[] = Array.isArray(attendanceRaw)
    ? attendanceRaw.map((p) => {
        const o = p as Record<string, unknown>;
        return {
          id: String(o.id ?? ""),
          name: String(o.name ?? ""),
          date: String(o.date ?? ""),
          attendance: num(o.attendance),
        };
      })
    : [];

  const byEventType: DashboardEventTypeRow[] = Array.isArray(typeRaw)
    ? typeRaw.map((row) => {
        const o = row as Record<string, unknown>;
        const key = String(o.key ?? "__uncategorized__");
        return {
          key,
          label: typeRowLabel(key),
          count: num(o.count),
          avgRevenue: num(o.avg_revenue),
          totalRevenue: num(o.total_revenue),
          avgAttendance:
            o.avg_attendance === null || o.avg_attendance === undefined
              ? null
              : num(o.avg_attendance),
          avgChecklistCompletion:
            o.avg_checklist_completion === null ||
            o.avg_checklist_completion === undefined
              ? null
              : num(o.avg_checklist_completion),
        };
      })
    : [];

  return {
    budget: {
      plannedSpend: num(budget.planned_spend),
      monthlyCap: num(budget.monthly_cap),
    },
    metrics: {
      upcomingCount: num(metrics.upcoming_count),
      atRiskCount: num(metrics.at_risk_count),
      avgCompletion: num(metrics.avg_completion),
      avgScore: num(metrics.avg_score),
      totalEvents: num(metrics.total_events),
    },
    filtered: {
      snapshot: {
        totalRevenue: num(snapshot.total_revenue),
        eventsWithRevenue: num(snapshot.events_with_revenue),
        avgAttendance:
          snapshot.avg_attendance === null ||
          snapshot.avg_attendance === undefined
            ? null
            : num(snapshot.avg_attendance),
        eventsWithAttendance: num(snapshot.events_with_attendance),
        avgChecklistCompletion:
          snapshot.avg_checklist_completion === null ||
          snapshot.avg_checklist_completion === undefined
            ? null
            : num(snapshot.avg_checklist_completion),
        eventCount: num(snapshot.event_count),
      },
      attendanceSeries,
      byEventType,
      roiTrends: parseRoiTrends(
        roiRaw && typeof roiRaw === "object" ? (roiRaw as Record<string, unknown>) : null
      ),
    },
  };
}

export type DashboardAggregatesRpcParams = {
  budgetMonth: string;
  budgetLocationKey: string;
  search: string;
  locationKey: string;
  owner: string;
  /** Defaults to {@link getDashboardEventDateBounds}. */
  window?: { start: string; end: string };
  /**
   * Cookie-resolved active org. When set, aggregate with explicit org filters so
   * org switches are correct before the browser refreshes the Supabase JWT.
   */
  organizationId?: string | null;
};

export async function fetchDashboardAggregates(
  supabase: SupabaseClient,
  params: DashboardAggregatesRpcParams
): Promise<DashboardAggregates> {
  const { start, end } = params.window ?? getDashboardEventDateBounds();
  const ym = params.budgetMonth?.slice(0, 7) ?? "";
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    throw new Error("Invalid budget month (expected YYYY-MM).");
  }

  if (params.organizationId) {
    return fetchDashboardAggregatesForOrganization(supabase, {
      ...params,
      organizationId: params.organizationId,
      window: { start, end },
      budgetMonth: ym,
    });
  }

  const { data, error } = await supabase.rpc("dashboard_aggregates", {
    p_window_start: start,
    p_window_end: end,
    p_budget_month: ym,
    p_budget_location_key: params.budgetLocationKey ?? "",
    p_search: params.search ?? "",
    p_location_key: params.locationKey ?? "",
    p_owner: params.owner ?? "",
  });

  if (error) throw error;
  return parseDashboardAggregatesJson(data);
}

type ChecklistAgg = { total: number; completed: number; estimated: number };

function roundInt(n: number | null): number | null {
  return n == null ? null : Math.round(n);
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function eventRevenue(e: Event): number {
  return (
    (Number(e.roi_service_revenue) || 0) +
    (Number(e.roi_motorclothes_revenue) || 0) +
    (Number(e.roi_bike_sales_revenue) || 0)
  );
}

function hasRoiFlag(e: Event): boolean {
  return (
    eventRevenue(e) > 0 ||
    (Number(e.roi_leads_generated) || 0) > 0 ||
    (Number(e.roi_bikes_sold) || 0) > 0 ||
    (Number(e.roi_event_cost) || 0) > 0
  );
}

function statusScore(status: string): number {
  switch (status) {
    case "planning":
      return 0.2;
    case "in_progress":
      return 0.4;
    case "ready_for_execution":
      return 0.7;
    case "live_event":
      return 0.9;
    case "completed":
      return 1;
    default:
      return 0;
  }
}

async function fetchChecklistAggs(
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<Map<string, ChecklistAgg>> {
  const out = new Map<string, ChecklistAgg>();
  if (eventIds.length === 0) return out;

  const { data, error } = await supabase
    .from("checklist_items")
    .select("event_id, is_checked, estimated_cost")
    .in("event_id", eventIds);
  if (error) throw error;

  for (const row of data ?? []) {
    const r = row as {
      event_id: string;
      is_checked: boolean | null;
      estimated_cost: number | string | null;
    };
    const cur = out.get(r.event_id) ?? { total: 0, completed: 0, estimated: 0 };
    cur.total += 1;
    if (r.is_checked) cur.completed += 1;
    cur.estimated += Number(r.estimated_cost) || 0;
    out.set(r.event_id, cur);
  }
  return out;
}

async function fetchDashboardAggregatesForOrganization(
  supabase: SupabaseClient,
  params: DashboardAggregatesRpcParams & {
    organizationId: string;
    window: { start: string; end: string };
  }
): Promise<DashboardAggregates> {
  const { start, end } = params.window;
  const budgetMonth = params.budgetMonth.slice(0, 7);
  const budgetLocationKey = params.budgetLocationKey.trim();
  const search = params.search.trim().toLowerCase();
  const locationKey = params.locationKey.trim();
  const owner = params.owner.trim();

  const [{ data: eventsData, error: eventsError }, { data: budgetRows, error: budgetError }] =
    await Promise.all([
      supabase
        .from("events")
        .select("*")
        .eq("organization_id", params.organizationId)
        .eq("is_archived", false)
        .gte("date", start)
        .lte("date", end),
      supabase
        .from("monthly_budgets")
        .select("location_key, budget_amount")
        .eq("organization_id", params.organizationId)
        .eq("month", `${budgetMonth}-01`),
    ]);
  if (eventsError) throw eventsError;
  if (budgetError) throw budgetError;

  const events = ((eventsData ?? []) as Event[]).sort((a, b) =>
    `${a.date}:${a.name}`.localeCompare(`${b.date}:${b.name}`)
  );
  const checklist = await fetchChecklistAggs(
    supabase,
    events.map((e) => e.id)
  );

  const filtered = events.filter((e) => {
    const loc = e.location_key ?? normalizeLocationKey(e.location);
    return (
      (!search ||
        e.name.toLowerCase().includes(search) ||
        (e.description ?? "").toLowerCase().includes(search)) &&
      (!locationKey || loc === locationKey) &&
      (!owner || e.owner === owner)
    );
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const fiveDays = new Date(today);
  fiveDays.setDate(fiveDays.getDate() + 5);
  const fiveDaysStr = fiveDays.toISOString().slice(0, 10);

  const completions = events
    .map((e) => checklist.get(e.id))
    .filter((c): c is ChecklistAgg => Boolean(c && c.total > 0))
    .map((c) => (100 * c.completed) / c.total);
  const scores = events.map((e) => {
    const c = checklist.get(e.id);
    const completion = c && c.total > 0 ? c.completed / c.total : 0;
    return (completion * 0.7 + statusScore(e.status) * 0.3) * 10;
  });

  const attendanceVals = filtered
    .map((e) => e.attendance)
    .filter((n): n is number => n != null && Number(n) >= 0);
  const completionVals = filtered
    .map((e) => checklist.get(e.id))
    .filter((c): c is ChecklistAgg => Boolean(c && c.total > 0))
    .map((c) => (100 * c.completed) / c.total);

  const byTypeMap = new Map<
    string,
    { events: Event[]; revenue: number; attendance: number[]; completion: number[] }
  >();
  for (const e of filtered) {
    const key = e.event_type ?? "__uncategorized__";
    const cur = byTypeMap.get(key) ?? {
      events: [],
      revenue: 0,
      attendance: [],
      completion: [],
    };
    cur.events.push(e);
    cur.revenue += eventRevenue(e);
    if (e.attendance != null && Number(e.attendance) >= 0) {
      cur.attendance.push(Number(e.attendance));
    }
    const c = checklist.get(e.id);
    if (c && c.total > 0) cur.completion.push((100 * c.completed) / c.total);
    byTypeMap.set(key, cur);
  }

  const byEventType = Array.from(byTypeMap.entries())
    .map(([key, row]) => ({
      key,
      label: typeRowLabel(key),
      count: row.events.length,
      avgRevenue: Number((row.revenue / Math.max(row.events.length, 1)).toFixed(2)),
      totalRevenue: Number(row.revenue.toFixed(2)),
      avgAttendance: roundInt(avg(row.attendance)),
      avgChecklistCompletion: roundInt(avg(row.completion)),
    }))
    .sort(
      (a, b) =>
        b.avgRevenue - a.avgRevenue ||
        b.totalRevenue - a.totalRevenue ||
        b.count - a.count
    );

  const roiRows = filtered
    .filter(hasRoiFlag)
    .map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      revenue: Number(eventRevenue(e).toFixed(2)),
    }))
    .sort((a, b) => `${a.date}:${a.name}`.localeCompare(`${b.date}:${b.name}`));
  let running = 0;
  const runningTotals = roiRows.map((r) => {
    running += r.revenue;
    return { id: r.id, running: Number(running.toFixed(2)) };
  });

  const plannedSpend = events
    .filter((e) => {
      const loc = e.location_key ?? normalizeLocationKey(e.location);
      return (
        e.date.slice(0, 7) === budgetMonth &&
        (!budgetLocationKey || loc === budgetLocationKey)
      );
    })
    .reduce((sum, e) => {
      const c = checklist.get(e.id);
      return sum + (Number(e.planned_budget) || 0) + (c?.estimated ?? 0);
    }, 0);

  const monthlyCap = (budgetRows ?? []).reduce((sum, row) => {
    const r = row as { location_key: string | null; budget_amount: number | string | null };
    if (budgetLocationKey && r.location_key !== budgetLocationKey) return sum;
    return sum + (Number(r.budget_amount) || 0);
  }, 0);

  return {
    budget: { plannedSpend, monthlyCap },
    metrics: {
      upcomingCount: events.filter(
        (e) => e.date >= todayStr && e.status !== "completed"
      ).length,
      atRiskCount: events.filter((e) => {
        const c = checklist.get(e.id);
        return (
          e.status !== "completed" &&
          e.status !== "live_event" &&
          Boolean(c && c.total > 0 && c.completed < c.total) &&
          e.date >= todayStr &&
          e.date <= fiveDaysStr
        );
      }).length,
      avgCompletion: Math.round(avg(completions) ?? 0),
      avgScore: Number((avg(scores) ?? 0).toFixed(4)),
      totalEvents: events.length,
    },
    filtered: {
      snapshot: {
        totalRevenue: Number(
          filtered.reduce((sum, e) => sum + eventRevenue(e), 0).toFixed(2)
        ),
        eventsWithRevenue: filtered.filter((e) => eventRevenue(e) > 0).length,
        avgAttendance: roundInt(avg(attendanceVals)),
        eventsWithAttendance: attendanceVals.length,
        avgChecklistCompletion: roundInt(avg(completionVals)),
        eventCount: filtered.length,
      },
      attendanceSeries: filtered
        .filter((e) => e.attendance != null && Number(e.attendance) >= 0)
        .map((e) => ({
          id: e.id,
          name: e.name,
          date: e.date,
          attendance: Number(e.attendance) || 0,
        })),
      byEventType,
      roiTrends: {
        rows: roiRows,
        runningTotals,
        totalTracked: Number(roiRows.reduce((sum, r) => sum + r.revenue, 0).toFixed(2)),
        maxRev: Math.max(...roiRows.map((r) => r.revenue), 1),
        maxRunning: Math.max(...runningTotals.map((r) => r.running), 1),
      },
    },
  };
}
