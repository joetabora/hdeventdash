"use client";

import { differenceInDays, parseISO, isToday } from "date-fns";
import { Clock } from "lucide-react";

interface DaysUntilProps {
  date: string;
  size?: "sm" | "md";
}

export function DaysUntilEvent({ date, size = "sm" }: DaysUntilProps) {
  const eventDate = parseISO(date);
  const days = differenceInDays(eventDate, new Date());
  const todayIsEvent = isToday(eventDate);

  let label: string;
  let colorClass: string;

  if (todayIsEvent) {
    label = "Today";
    colorClass = "text-harley-danger";
  } else if (days < 0) {
    const absDays = Math.abs(days);
    label = `${absDays} day${absDays !== 1 ? "s" : ""} ago`;
    colorClass = "text-harley-text-muted";
  } else if (days < 3) {
    label = `${days} day${days !== 1 ? "s" : ""} away`;
    colorClass = "text-harley-danger";
  } else if (days <= 7) {
    label = `${days} days away`;
    colorClass = "text-harley-warning";
  } else {
    label = `${days} days away`;
    colorClass = "text-harley-success";
  }

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass}`}>
        <Clock className="w-3 h-3" />
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${colorClass}`}>
      <Clock className="w-4 h-4" />
      {label}
    </span>
  );
}
