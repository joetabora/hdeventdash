"use client";

import { useMemo } from "react";
import { format, parseISO, subMonths } from "date-fns";
import type { MonthCapRollup } from "@/lib/budgets";
import { formatUsd } from "@/lib/format-currency";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";

function shortUsd(n: number): string {
  if (n <= 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000) return `$${Math.round(n / 1000)}k`;
  if (n >= 10_000) return `$${Math.round(n / 1000)}k`;
  return formatUsd(n);
}

export function BudgetMonthTimeline({
  timeline,
  selectedYearMonth,
  onSelectMonth,
  canManage,
  copying,
  onCopyPrevious,
}: {
  timeline: MonthCapRollup[];
  selectedYearMonth: string;
  onSelectMonth: (ym: string) => void;
  canManage: boolean;
  copying: boolean;
  onCopyPrevious: () => void | Promise<void>;
}) {
  const prevHasCaps = useMemo(() => {
    const sel = parseISO(`${selectedYearMonth.slice(0, 7)}-01`);
    if (Number.isNaN(sel.getTime())) return false;
    const prevYm = format(subMonths(sel, 1), "yyyy-MM");
    const entry = timeline.find((t) => t.yearMonth === prevYm);
    return (entry?.venueCount ?? 0) > 0;
  }, [timeline, selectedYearMonth]);

  return (
    <Card className="!p-4 md:!p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-harley-text-muted">
            Plan by month
          </p>
          <p className="text-xs text-harley-text-muted mt-1 max-w-2xl">
            Each month has its own caps. Select a month to add or edit venue
            limits ahead of time—when events land in that month, caps and
            planned spend apply automatically.
          </p>
        </div>
        {canManage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={copying || !prevHasCaps}
            onClick={() => void onCopyPrevious()}
            title={
              prevHasCaps
                ? "Copy all venue caps from the prior month into the selected month"
                : "No caps exist in the month before the one you selected"
            }
            className="shrink-0"
          >
            {copying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            Copy from previous month
          </Button>
        )}
      </div>
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-2 min-w-min">
          {timeline.map((m) => {
            const active = m.yearMonth === selectedYearMonth.slice(0, 7);
            const label = format(parseISO(`${m.yearMonth}-01`), "MMM yyyy");
            return (
              <button
                key={m.yearMonth}
                type="button"
                onClick={() => onSelectMonth(m.yearMonth)}
                className={`shrink-0 w-[100px] rounded-lg border px-2 py-2.5 text-left transition-colors ${
                  active
                    ? "border-harley-orange bg-harley-orange/15 ring-1 ring-harley-orange/40"
                    : "border-harley-gray bg-harley-black/30 hover:border-harley-gray-lighter/60"
                }`}
              >
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    active ? "text-harley-orange" : "text-harley-text-muted"
                  }`}
                >
                  {label}
                </p>
                <p className="text-sm font-bold text-harley-text tabular-nums mt-1 truncate">
                  {shortUsd(m.totalCap)}
                </p>
                <p className="text-[10px] text-harley-text-muted mt-0.5">
                  {m.venueCount === 0
                    ? "No caps"
                    : `${m.venueCount} venue${m.venueCount === 1 ? "" : "s"}`}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
