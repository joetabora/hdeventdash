"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { Event } from "@/types/database";
import type { ChecklistStats } from "@/lib/events";
import {
  computePerformanceSnapshot,
  attendanceTrendSeries,
  aggregatesByEventType,
} from "@/lib/analytics";
import { formatUsd } from "@/lib/event-roi";
import { RoiTrendsCard } from "@/components/dashboard/roi-trends-card";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  Users,
  DollarSign,
  CheckCircle2,
  TrendingUp,
  PieChart,
} from "lucide-react";

interface AnalyticsDashboardProps {
  events: Event[];
  checklistStats: ChecklistStats;
}

export function AnalyticsDashboard({
  events,
  checklistStats,
}: AnalyticsDashboardProps) {
  const snapshot = useMemo(
    () => computePerformanceSnapshot(events, checklistStats),
    [events, checklistStats]
  );

  const attendanceSeries = useMemo(
    () => attendanceTrendSeries(events),
    [events]
  );

  const typeRows = useMemo(
    () => aggregatesByEventType(events, checklistStats),
    [events, checklistStats]
  );

  const maxAtt =
    attendanceSeries.length > 0
      ? Math.max(...attendanceSeries.map((p) => p.attendance), 1)
      : 1;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-harley-text flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-harley-orange" />
          Event performance
        </h2>
        <p className="text-sm text-harley-text-muted mt-1">
          Metrics respect your current filters (search, location, owner).
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="!p-4 border-harley-orange/20 bg-harley-orange/5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-harley-text-muted">
                Tracked revenue
              </p>
              <p className="text-2xl font-bold text-harley-text tabular-nums mt-1">
                {formatUsd(snapshot.totalRevenue)}
              </p>
              <p className="text-xs text-harley-text-muted mt-0.5">
                {snapshot.eventsWithRevenue} event
                {snapshot.eventsWithRevenue !== 1 ? "s" : ""} with ROI data
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-harley-orange/80 shrink-0" />
          </div>
        </Card>

        <Card className="!p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-harley-text-muted">
                Avg. attendance
              </p>
              <p className="text-2xl font-bold text-harley-text tabular-nums mt-1">
                {snapshot.avgAttendance != null
                  ? snapshot.avgAttendance.toLocaleString()
                  : "—"}
              </p>
              <p className="text-xs text-harley-text-muted mt-0.5">
                {snapshot.eventsWithAttendance > 0
                  ? `${snapshot.eventsWithAttendance} event${snapshot.eventsWithAttendance !== 1 ? "s" : ""} with headcount`
                  : "Add attendance in event recap"}
              </p>
            </div>
            <Users className="w-8 h-8 text-harley-info/80 shrink-0" />
          </div>
        </Card>

        <Card className="!p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-harley-text-muted">
                Checklist completion
              </p>
              <p className="text-2xl font-bold text-harley-text tabular-nums mt-1">
                {snapshot.avgChecklistCompletion != null
                  ? `${snapshot.avgChecklistCompletion}%`
                  : "—"}
              </p>
              <p className="text-xs text-harley-text-muted mt-0.5">
                Average across events with checklists
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-harley-success/80 shrink-0" />
          </div>
        </Card>

        <Card className="!p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-harley-text-muted">
                Events in view
              </p>
              <p className="text-2xl font-bold text-harley-text tabular-nums mt-1">
                {snapshot.eventCount}
              </p>
              <p className="text-xs text-harley-text-muted mt-0.5">
                Active (not archived)
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-harley-text-muted shrink-0" />
          </div>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-harley-text flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-harley-orange" />
          Attendance trends
        </h3>
        {attendanceSeries.length === 0 ? (
          <Card className="!p-5">
            <p className="text-sm text-harley-text-muted">
              No attendance recorded yet. Enter headcount in the Event Recap on
              completed or live events to see trends by date.
            </p>
          </Card>
        ) : (
          <Card className="!p-4 md:!p-5 space-y-3">
            <p className="text-xs text-harley-text-muted">
              By event date — bar height is attendance (max{" "}
              {maxAtt.toLocaleString()})
            </p>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {attendanceSeries.map((p) => {
                const w = (p.attendance / maxAtt) * 100;
                return (
                  <div key={p.id} className="flex items-center gap-3 text-xs">
                    <span className="text-harley-text-muted w-20 shrink-0 tabular-nums">
                      {format(parseISO(p.date), "MMM d, yy")}
                    </span>
                    <Link
                      href={`/events/${p.id}`}
                      className="font-medium text-harley-text hover:text-harley-orange truncate min-w-0 flex-1 max-w-[40%]"
                    >
                      {p.name}
                    </Link>
                    <div className="flex-1 min-w-[80px] h-2 rounded-full bg-harley-gray/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-harley-info/80 to-harley-info"
                        style={{ width: `${Math.max(w, 3)}%` }}
                      />
                    </div>
                    <span className="text-harley-text tabular-nums w-12 text-right shrink-0">
                      {p.attendance}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-harley-text mb-3">
          ROI trends
        </h3>
        <RoiTrendsCard events={events} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-harley-text flex items-center gap-2 mb-3">
          <PieChart className="w-4 h-4 text-harley-orange" />
          Top performing event types
        </h3>
        <p className="text-xs text-harley-text-muted mb-3">
          Grouped by event type (set on each event). Ranked by average tracked
          revenue per event.
        </p>
        {typeRows.length === 0 ? (
          <Card className="!p-5">
            <p className="text-sm text-harley-text-muted">No events in view.</p>
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-harley-gray bg-harley-gray-light/10">
                    <th className="text-left px-4 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider">
                      Events
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider">
                      Avg revenue
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider hidden md:table-cell">
                      Total revenue
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider hidden sm:table-cell">
                      Avg attendance
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider hidden lg:table-cell">
                      Avg checklist
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-harley-gray/40">
                  {typeRows.map((row, idx) => (
                    <tr
                      key={row.key}
                      className={
                        idx === 0
                          ? "bg-harley-orange/5"
                          : "hover:bg-harley-gray-light/10"
                      }
                    >
                      <td className="px-4 py-3 font-medium text-harley-text">
                        {row.label}
                        {idx === 0 && row.avgRevenue > 0 && (
                          <span className="ml-2 text-[10px] uppercase text-harley-orange font-semibold">
                            Top
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-harley-text-muted tabular-nums">
                        {row.count}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-harley-text tabular-nums">
                        {formatUsd(row.avgRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-harley-text-muted tabular-nums hidden md:table-cell">
                        {formatUsd(row.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-harley-text-muted tabular-nums hidden sm:table-cell">
                        {row.avgAttendance != null
                          ? row.avgAttendance.toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-harley-text-muted tabular-nums hidden lg:table-cell">
                        {row.avgChecklistCompletion != null
                          ? `${row.avgChecklistCompletion}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
