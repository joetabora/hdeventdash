import { parseISO, compareAsc } from "date-fns";
import type { Event, EventType } from "@/types/database";
import { EVENT_TYPES } from "@/types/database";
import type { ChecklistStats } from "@/lib/events";
import { totalRoiRevenue } from "@/lib/event-roi";

export function eventTypeLabel(type: EventType | null | undefined): string {
  if (type == null) return "Uncategorized";
  return EVENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export interface PerformanceSnapshot {
  totalRevenue: number;
  eventsWithRevenue: number;
  avgAttendance: number | null;
  eventsWithAttendance: number;
  avgChecklistCompletion: number | null;
  eventCount: number;
}

export function computePerformanceSnapshot(
  events: Event[],
  stats: ChecklistStats
): PerformanceSnapshot {
  let totalRevenue = 0;
  let eventsWithRevenue = 0;
  let attSum = 0;
  let attN = 0;
  const completionPcts: number[] = [];

  for (const e of events) {
    const r = totalRoiRevenue(e);
    if (r > 0) {
      totalRevenue += r;
      eventsWithRevenue++;
    }
    if (e.attendance != null && e.attendance >= 0) {
      attSum += e.attendance;
      attN++;
    }
    const s = stats[e.id];
    if (s && s.total > 0) {
      completionPcts.push((s.completed / s.total) * 100);
    }
  }

  return {
    totalRevenue,
    eventsWithRevenue,
    avgAttendance: attN > 0 ? Math.round(attSum / attN) : null,
    eventsWithAttendance: attN,
    avgChecklistCompletion:
      completionPcts.length > 0
        ? Math.round(
            completionPcts.reduce((a, b) => a + b, 0) / completionPcts.length
          )
        : null,
    eventCount: events.length,
  };
}

export interface AttendancePoint {
  id: string;
  name: string;
  date: string;
  attendance: number;
}

export function attendanceTrendSeries(events: Event[]): AttendancePoint[] {
  return events
    .filter((e) => e.attendance != null && e.attendance >= 0)
    .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)))
    .map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      attendance: e.attendance as number,
    }));
}

export interface EventTypeAggregateRow {
  key: string;
  label: string;
  count: number;
  avgRevenue: number;
  totalRevenue: number;
  avgAttendance: number | null;
  avgChecklistCompletion: number | null;
}

export function aggregatesByEventType(
  events: Event[],
  stats: ChecklistStats
): EventTypeAggregateRow[] {
  const groups = new Map<string, Event[]>();
  for (const e of events) {
    const key = e.event_type ?? "__uncategorized__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const rows: EventTypeAggregateRow[] = [];

  for (const [key, group] of groups) {
    const label =
      key === "__uncategorized__"
        ? "Uncategorized"
        : eventTypeLabel(key as EventType);

    let totalRevenue = 0;
    let attSum = 0;
    let attN = 0;
    const comp: number[] = [];

    for (const e of group) {
      totalRevenue += totalRoiRevenue(e);
      if (e.attendance != null && e.attendance >= 0) {
        attSum += e.attendance;
        attN++;
      }
      const s = stats[e.id];
      if (s && s.total > 0) {
        comp.push((s.completed / s.total) * 100);
      }
    }

    const n = group.length;
    rows.push({
      key,
      label,
      count: n,
      totalRevenue,
      avgRevenue: n > 0 ? totalRevenue / n : 0,
      avgAttendance: attN > 0 ? Math.round(attSum / attN) : null,
      avgChecklistCompletion:
        comp.length > 0
          ? Math.round(comp.reduce((a, b) => a + b, 0) / comp.length)
          : null,
    });
  }

  rows.sort(
    (a, b) =>
      b.avgRevenue - a.avgRevenue ||
      b.totalRevenue - a.totalRevenue ||
      b.count - a.count
  );

  return rows;
}
