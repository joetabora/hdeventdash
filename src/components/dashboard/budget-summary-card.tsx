"use client";

import { useState } from "react";
import {
  budgetMonthToDbDate,
  sumPlannedBudgetForMonth,
  totalMonthlyBudgetCapacity,
  budgetPercentUsed,
  budgetCardStatus,
  type BudgetCardStatus,
} from "@/lib/budgets";
import { Event, MonthlyBudget } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Plus } from "lucide-react";

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n: number): string {
  return `${n.toFixed(n >= 100 && n % 1 < 0.05 ? 0 : 1)}%`;
}

const DIVIDER = "border-t border-[#2a2a2a]";

const statusCopy: Record<
  BudgetCardStatus,
  { label: string; dot: string; bar: string; barGlow: string }
> = {
  neutral: {
    label: "On track",
    dot: "bg-harley-text-muted",
    bar: "bg-harley-gray-lighter",
    barGlow: "",
  },
  warning: {
    label: "Approaching limit",
    dot: "bg-harley-orange",
    bar: "bg-harley-orange",
    barGlow: "shadow-[0_0_10px_rgba(255,102,0,0.3)]",
  },
  danger: {
    label: "Over budget",
    dot: "bg-harley-danger",
    bar: "bg-harley-danger",
    barGlow: "shadow-[0_0_12px_rgba(240,80,80,0.35)]",
  },
  no_budget: {
    label: "No cap set",
    dot: "bg-harley-text-muted",
    bar: "bg-transparent",
    barGlow: "",
  },
};

interface BudgetSummaryCardProps {
  events: Event[];
  monthlyBudgets: MonthlyBudget[];
  budgetMonth: string;
  onBudgetMonthChange: (ym: string) => void;
  locationFilter: string;
  canManageBudgets: boolean;
  onBudgetsUpdated: () => void;
}

export function BudgetSummaryCard({
  events,
  monthlyBudgets,
  budgetMonth,
  onBudgetMonthChange,
  locationFilter,
  canManageBudgets,
  onBudgetsUpdated,
}: BudgetSummaryCardProps) {
  const [newLocation, setNewLocation] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const cap = totalMonthlyBudgetCapacity(monthlyBudgets, locationFilter);
  const planned = sumPlannedBudgetForMonth(events, budgetMonth, locationFilter);
  const remaining = cap - planned;
  const pctUsed = budgetPercentUsed(planned, cap);
  const status = budgetCardStatus(planned, cap);
  const statusTheme = statusCopy[status];
  const barWidthPct = cap > 0 ? Math.min(100, pctUsed) : 0;

  async function handleAddRow(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(newAmount);
    if (!newLocation.trim() || Number.isNaN(amt) || amt < 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: budgetMonthToDbDate(budgetMonth),
          location: newLocation.trim(),
          budget_amount: amt,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? res.statusText);
      }
      setNewLocation("");
      setNewAmount("");
      onBudgetsUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRow(id: string) {
    if (!confirm("Remove this monthly budget row?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/budgets/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? res.statusText);
      }
      onBudgetsUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  async function handleAmountBlur(row: MonthlyBudget, raw: string) {
    const amt = parseFloat(raw);
    if (Number.isNaN(amt) || amt < 0 || amt === Number(row.budget_amount)) return;
    setBusyId(row.id);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: budgetMonthToDbDate(budgetMonth),
          location: row.location,
          budget_amount: amt,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? res.statusText);
      }
      onBudgetsUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="!p-0 overflow-hidden border-harley-gray shadow-none">
      <div className="p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-harley-text-muted">
              Budget overview
            </p>
            <p className="text-xs text-harley-text-muted mt-1 max-w-xl leading-relaxed">
              {locationFilter ? (
                <>Events at &quot;{locationFilter}&quot; · month {budgetMonth}</>
              ) : (
                <>
                  All locations combined · caps summed · planned includes every
                  event in {budgetMonth}
                </>
              )}
            </p>
          </div>
          <label className="flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-medium uppercase tracking-wider text-harley-text-muted">
              Period
            </span>
            <input
              type="month"
              value={budgetMonth}
              onChange={(e) => onBudgetMonthChange(e.target.value)}
              className="px-3 py-2 rounded-lg bg-harley-black border border-harley-gray text-harley-text text-sm font-medium focus:outline-none focus:ring-1 focus:ring-harley-orange/50"
            />
          </label>
        </div>

        <div className={`mt-8 pt-8 ${DIVIDER}`}>
          <p className="text-xs font-medium text-harley-text-muted uppercase tracking-wider">
            Monthly budget
          </p>
          <p className="mt-1 text-3xl sm:text-4xl font-bold text-harley-text tracking-tight tabular-nums transition-colors duration-300">
            {cap > 0 ? formatUsd(cap) : "—"}
          </p>
        </div>

        <div className={`mt-8 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 ${DIVIDER}`}>
          <div>
            <p className="text-xs font-medium text-harley-text-muted uppercase tracking-wider">
              Planned spend
            </p>
            <p className="mt-2 text-xl font-semibold text-harley-text tabular-nums tracking-tight">
              {formatUsd(planned)}
            </p>
          </div>
          <div
            className={`rounded-xl border px-5 py-4 ${
              status === "danger"
                ? "border-harley-danger/35 bg-harley-danger/[0.06]"
                : status === "warning"
                  ? "border-harley-orange/35 bg-harley-orange/[0.06]"
                  : "border-harley-gray bg-harley-black/40"
            }`}
          >
            <p className="text-xs font-medium text-harley-text-muted uppercase tracking-wider">
              Remaining budget
            </p>
            <p
              className={`mt-2 text-xl font-bold tabular-nums tracking-tight ${
                cap <= 0
                  ? "text-harley-text-muted"
                  : remaining < 0
                    ? "text-harley-danger"
                    : "text-harley-text"
              }`}
            >
              {cap > 0 ? formatUsd(remaining) : "—"}
            </p>
          </div>
        </div>

        <div className={`mt-8 pt-8 ${DIVIDER}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-medium text-harley-text-muted tabular-nums transition-all duration-300">
              {cap > 0
                ? `${formatPct(pctUsed)} of budget used`
                : "Set a monthly cap to track utilization"}
            </span>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-harley-text">
              <span
                className={`h-2 w-2 rounded-full shrink-0 transition-colors duration-300 ${statusTheme.dot}`}
                aria-hidden
              />
              {statusTheme.label}
            </span>
          </div>
          {/* Vertical padding so bar glow is not clipped */}
          <div className="py-2 -my-1">
            <div className="relative h-2 w-full rounded-full bg-harley-gray">
              {cap > 0 ? (
                <div
                  className={`absolute left-0 top-0 h-full rounded-full ease-out will-change-[width] motion-reduce:transition-none ${statusTheme.bar} ${statusTheme.barGlow} transition-[width,box-shadow] duration-700 [transition-timing-function:cubic-bezier(0.33,1,0.68,1)]`}
                  style={{ width: `${barWidthPct}%` }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {canManageBudgets && (
        <div className={`border-t border-[#2a2a2a] px-6 py-5 md:px-8 md:py-6 bg-harley-black/30`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-harley-text-muted">
            Manage caps
          </p>
          <p className="text-xs text-harley-text-muted mt-1 mb-4">
            Match event location text exactly. One cap per location per month.
          </p>
          {monthlyBudgets.length > 0 && (
            <ul className="space-y-2 mb-4">
              {monthlyBudgets.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-2 text-sm rounded-lg px-3 py-2.5 border border-harley-gray bg-harley-dark/50"
                >
                  <span className="font-medium text-harley-text min-w-[100px]">
                    {row.location || "(default)"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    defaultValue={row.budget_amount}
                    key={`${row.id}-${row.updated_at}`}
                    disabled={busyId === row.id}
                    onBlur={(e) => handleAmountBlur(row, e.target.value)}
                    className="w-32 px-2 py-1.5 rounded-md bg-harley-black border border-harley-gray text-harley-text text-sm tabular-nums disabled:opacity-50"
                  />
                  {busyId === row.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-harley-text-muted" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDeleteRow(row.id)}
                    disabled={busyId === row.id}
                    className="ml-auto p-1.5 rounded-md text-harley-text-muted hover:text-harley-danger hover:bg-harley-danger/10 disabled:opacity-50"
                    aria-label="Delete budget row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={handleAddRow}
            className="flex flex-col sm:flex-row flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-harley-text-muted mb-1.5">
                Location
              </label>
              <input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. Milwaukee, WI"
                className="w-full px-3 py-2 rounded-lg bg-harley-black border border-harley-gray text-sm text-harley-text"
              />
            </div>
            <div className="w-full sm:w-36">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-harley-text-muted mb-1.5">
                Cap ($)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-harley-black border border-harley-gray text-sm text-harley-text tabular-nums"
              />
            </div>
            <Button type="submit" disabled={saving} size="sm" className="w-full sm:w-auto">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add / update cap
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}
