import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventType } from "@/types/database";
import { getDashboardEventDateBounds } from "@/lib/events";
import { eventTypeLabel } from "@/lib/analytics";

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
