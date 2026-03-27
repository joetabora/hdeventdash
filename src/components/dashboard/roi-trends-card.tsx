"use client";

import Link from "next/link";
import { parseISO, format } from "date-fns";
import { formatUsd } from "@/lib/format-currency";
import type { DashboardRoiTrends } from "@/lib/dashboard-aggregates";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface RoiTrendsCardProps {
  trends: DashboardRoiTrends;
}

export function RoiTrendsCard({ trends }: RoiTrendsCardProps) {
  const { rows, runningTotals, totalTracked, maxRev, maxRunning } = trends;

  if (rows.length === 0) {
    return (
      <Card className="!p-4 md:!p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-harley-orange" />
          <h2 className="text-lg font-semibold text-harley-text">ROI trends</h2>
        </div>
        <p className="text-sm text-harley-text-muted">
          When you add revenue or lead counts on event pages, they&apos;ll show up
          here over time so you can compare which events drove the most return.
        </p>
      </Card>
    );
  }

  return (
    <Card className="!p-4 md:!p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-harley-orange" />
          <div>
            <h2 className="text-lg font-semibold text-harley-text">ROI trends</h2>
            <p className="text-xs text-harley-text-muted">
              Revenue by event date · cumulative trend below
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-harley-text-muted">
          Revenue per event
        </p>
        {rows.map((e) => {
          const rev = e.revenue;
          const w = (rev / maxRev) * 100;
          return (
            <div key={e.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <Link
                  href={`/events/${e.id}`}
                  className="font-medium text-harley-text hover:text-harley-orange truncate min-w-0 transition-colors"
                >
                  {e.name}
                </Link>
                <span className="text-harley-text-muted shrink-0 tabular-nums">
                  {formatUsd(rev)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-harley-gray/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-harley-orange-dark to-harley-orange transition-all duration-300"
                  style={{ width: `${Math.max(w, rev > 0 ? 4 : 0)}%` }}
                />
              </div>
              <p className="text-[10px] text-harley-text-muted/80">
                {format(parseISO(e.date), "MMM d, yyyy")}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-harley-gray/50 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-harley-text-muted">
            Cumulative revenue over time
          </p>
          <span className="text-xs font-bold text-harley-success tabular-nums">
            Total {formatUsd(totalTracked)}
          </span>
        </div>
        <div className="flex items-end gap-0.5 h-16 pl-0.5">
          {runningTotals.map(({ id, running }) => {
            const h = (running / maxRunning) * 100;
            return (
              <Link
                key={`bar-${id}`}
                href={`/events/${id}`}
                title={`Cumulative ${formatUsd(running)}`}
                className="flex-1 min-w-[4px] max-w-[24px] group flex flex-col justify-end"
              >
                <div
                  className="w-full rounded-t-sm bg-harley-success/70 group-hover:bg-harley-success transition-colors"
                  style={{ height: `${Math.max(h, 8)}%` }}
                />
              </Link>
            );
          })}
        </div>
        <p className="text-[10px] text-harley-text-muted">
          Each bar height is cumulative tracked revenue after that event (by date).
        </p>
      </div>
    </Card>
  );
}
