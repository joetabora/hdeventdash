"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  budgetMonthToDbDate,
  sumPlannedBudgetForMonth,
  totalMonthlyBudgetCapacity,
  budgetHealth,
  upsertMonthlyBudget,
  deleteMonthlyBudget,
  type BudgetHealth,
} from "@/lib/budgets";
import { Event, MonthlyBudget } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PiggyBank, Trash2, Plus } from "lucide-react";

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const healthRing: Record<BudgetHealth, string> = {
  green: "border-harley-success/60 bg-harley-success/5",
  yellow: "border-harley-warning/60 bg-harley-warning/5",
  red: "border-harley-danger/60 bg-harley-danger/5",
  neutral: "border-harley-gray-lighter/50 bg-harley-gray/20",
};

const healthLabel: Record<BudgetHealth, string> = {
  green: "Under budget",
  yellow: "80%+ of budget planned",
  red: "Over planned cap",
  neutral: "Set a monthly cap to track",
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
  const health = budgetHealth(planned, cap);

  async function handleAddRow(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(newAmount);
    if (!newLocation.trim() || Number.isNaN(amt) || amt < 0) return;
    const supabase = createClient();
    setSaving(true);
    try {
      await upsertMonthlyBudget(supabase, {
        month: budgetMonthToDbDate(budgetMonth),
        location: newLocation.trim(),
        budget_amount: amt,
      });
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
    const supabase = createClient();
    setBusyId(id);
    try {
      await deleteMonthlyBudget(supabase, id);
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
    const supabase = createClient();
    setBusyId(row.id);
    try {
      await upsertMonthlyBudget(supabase, {
        month: budgetMonthToDbDate(budgetMonth),
        location: row.location,
        budget_amount: amt,
      });
      onBudgetsUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card
      className={`!p-4 md:!p-5 border-2 transition-colors ${healthRing[health]}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-harley-black/30 text-harley-orange shrink-0">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide">
              Monthly budget
            </h2>
            <p className="text-xs text-harley-text-muted mt-0.5">
              {healthLabel[health]}
              {locationFilter
                ? ` · Filtered to events at "${locationFilter}".`
                : " · All locations: caps are summed; planned includes every event in this month."}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-xs text-harley-text-muted">
                <span>Month</span>
                <input
                  type="month"
                  value={budgetMonth}
                  onChange={(e) => onBudgetMonthChange(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-harley-black/40 border border-harley-gray-lighter/40 text-harley-text text-sm focus:outline-none focus:border-harley-orange/60"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 shrink-0 w-full lg:w-auto">
          <div className="rounded-lg bg-harley-black/25 px-4 py-3 border border-harley-gray/40">
            <p className="text-[10px] uppercase tracking-wide text-harley-text-muted">
              Monthly cap
            </p>
            <p className="text-lg font-bold text-harley-text tabular-nums">
              {formatUsd(cap)}
            </p>
          </div>
          <div className="rounded-lg bg-harley-black/25 px-4 py-3 border border-harley-gray/40">
            <p className="text-[10px] uppercase tracking-wide text-harley-text-muted">
              Planned (events)
            </p>
            <p className="text-lg font-bold text-harley-orange tabular-nums">
              {formatUsd(planned)}
            </p>
          </div>
          <div className="rounded-lg bg-harley-black/25 px-4 py-3 border border-harley-gray/40">
            <p className="text-[10px] uppercase tracking-wide text-harley-text-muted">
              Remaining
            </p>
            <p
              className={`text-lg font-bold tabular-nums ${
                remaining < 0
                  ? "text-harley-danger"
                  : remaining === 0
                    ? "text-harley-warning"
                    : "text-harley-success"
              }`}
            >
              {formatUsd(remaining)}
            </p>
          </div>
        </div>
      </div>

      {canManageBudgets && (
        <div className="mt-5 pt-5 border-t border-harley-gray/50 space-y-4">
          <p className="text-xs font-medium text-harley-text-muted uppercase tracking-wide">
            Caps by location (managers)
          </p>
          <p className="text-xs text-harley-text-muted">
            Use the same location text as on events (exact match). One row per location per month.
          </p>
          {monthlyBudgets.length > 0 && (
            <ul className="space-y-2">
              {monthlyBudgets.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-2 text-sm bg-harley-black/20 rounded-lg px-3 py-2 border border-harley-gray/40"
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
                    className="w-32 px-2 py-1 rounded bg-harley-black/40 border border-harley-gray-lighter/40 text-harley-text text-sm tabular-nums disabled:opacity-50"
                  />
                  {busyId === row.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-harley-text-muted" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDeleteRow(row.id)}
                    disabled={busyId === row.id}
                    className="ml-auto p-1.5 rounded text-harley-text-muted hover:text-harley-danger hover:bg-harley-danger/10 disabled:opacity-50"
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
            className="flex flex-col sm:flex-row flex-wrap items-end gap-2"
          >
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] uppercase text-harley-text-muted mb-1">
                Location
              </label>
              <input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. Milwaukee, WI"
                className="w-full px-3 py-2 rounded-lg bg-harley-black/40 border border-harley-gray-lighter/40 text-sm text-harley-text"
              />
            </div>
            <div className="w-full sm:w-36">
              <label className="block text-[10px] uppercase text-harley-text-muted mb-1">
                Cap ($)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-harley-black/40 border border-harley-gray-lighter/40 text-sm text-harley-text tabular-nums"
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
