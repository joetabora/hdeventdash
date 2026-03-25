"use client";

import { ChecklistItem } from "@/types/database";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface ProgressBarProps {
  checklist: ChecklistItem[];
}

export function ProgressBar({ checklist }: ProgressBarProps) {
  const total = checklist.length;
  const completed = checklist.filter((item) => item.is_checked).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = total > 0 && completed === total;

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
