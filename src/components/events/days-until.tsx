"use client";

import { differenceInDays, parseISO, isToday } from "date-fns";
import { Clock } from "lucide-react";

interface DaysUntilProps {
  date: string;
  size?: "sm" | "md" | "lg";
}

export function DaysUntilEvent({ date, size = "sm" }: DaysUntilProps) {
  const eventDate = parseISO(date);
  const days = differenceInDays(eventDate, new Date());
  const todayIsEvent = isToday(eventDate);

  let label: string;
  let colorClass: string;

  if (todayIsEvent) {
    label = size === "lg" ? "Event is today" : "Today";
    colorClass = "text-harley-danger";
  } else if (days < 0) {
    const absDays = Math.abs(days);
    label = `${absDays} day${absDays !== 1 ? "s" : ""} ago`;
    colorClass = "text-harley-text-muted";
  } else if (days < 3) {
    label =
      size === "lg"
        ? `Event in ${days} day${days !== 1 ? "s" : ""}`
        : `${days} day${days !== 1 ? "s" : ""} away`;
    colorClass = "text-harley-danger";
  } else if (days <= 7) {
    label =
      size === "lg" ? `Event in ${days} days` : `${days} days away`;
    colorClass = "text-harley-warning";
  } else {
    label =
      size === "lg" ? `Event in ${days} days` : `${days} days away`;
    colorClass = "text-harley-success";
  }

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass}`}>
        <Clock className="w-3 h-3 shrink-0" />
        {label}
      </span>
    );
  }

  if (size === "lg") {
    return (
      <span
        className={`inline-flex items-center gap-2 text-base sm:text-lg font-semibold ${colorClass}`}
      >
        <Clock className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${colorClass}`}>
      <Clock className="w-4 h-4 shrink-0" />
      {label}
    </span>
  );
}
