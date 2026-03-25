"use client";

import { ChecklistItem } from "@/types/database";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface ProgressBarProps {
  checklist: ChecklistItem[];
  /** Larger typography and bar for Event Live Mode */
  variant?: "default" | "live";
}

export function ProgressBar({ checklist, variant = "default" }: ProgressBarProps) {
  const total = checklist.length;
  const completed = checklist.filter((item) => item.is_checked).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = total > 0 && completed === total;

  if (variant === "live") {
    return (
      <Card className="!p-5 sm:!p-6 mb-2 border-harley-orange/20 bg-harley-dark/90">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-4">
          <div className="flex items-center gap-3">
            {isComplete && (
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-harley-success shrink-0" />
            )}
            <span className="text-lg sm:text-xl font-bold text-harley-text tracking-tight">
              Checklist progress
            </span>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-base sm:text-lg text-harley-text-muted">
              {completed} / {total} tasks
            </span>
            <span
              className={`text-2xl sm:text-3xl font-bold tabular-nums ${
                isComplete ? "text-harley-success" : "text-harley-orange"
              }`}
            >
              {percentage}%
            </span>
          </div>
        </div>
        <div className="w-full h-4 sm:h-5 bg-harley-gray rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isComplete
                ? "bg-gradient-to-r from-harley-success to-emerald-400"
                : "bg-gradient-to-r from-harley-orange-dark to-harley-orange"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {isComplete && (
            <CheckCircle2 className="w-5 h-5 text-harley-success" />
          )}
          <span className="text-sm font-semibold text-harley-text">
            Event Progress
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-harley-text-muted">
            {completed} of {total} tasks
          </span>
          <span
            className={`text-sm font-bold ${
              isComplete ? "text-harley-success" : "text-harley-orange"
            }`}
          >
            {percentage}% Complete
          </span>
        </div>
      </div>
      <div className="w-full h-3 bg-harley-gray rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isComplete
              ? "bg-gradient-to-r from-harley-success to-emerald-400"
              : "bg-gradient-to-r from-harley-orange-dark to-harley-orange"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </Card>
  );
}
