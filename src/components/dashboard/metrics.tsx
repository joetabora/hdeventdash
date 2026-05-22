"use client";

import { CalendarCheck, AlertTriangle, CheckCircle2, Star } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  accent?: "orange" | "danger" | "success" | "muted";
  staggerClass?: string;
}

const accentStyles = {
  orange:
    "border-harley-orange/18 text-harley-orange bg-harley-orange/[0.1] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06)]",
  danger:
    "border-harley-danger/22 text-harley-danger bg-harley-danger/[0.1] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.05)]",
  success:
    "border-harley-success/22 text-harley-success bg-harley-success/[0.09] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.05)]",
  muted:
    "border-border-subtle text-harley-text-muted bg-surface-base/45 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03)]",
};

function MetricCard({
  label,
  value,
  subtext,
  icon,
  accent = "orange",
  staggerClass,
}: MetricCardProps) {
  return (
    <Card
      padding="sm"
      hover
      className={cn(
        "group overflow-hidden animate-page-in",
        staggerClass ?? ""
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-harley-text-muted">
            {label}
          </p>
          <p className="metric-value mt-1 font-display-heading text-3xl font-bold tracking-tight text-harley-text">
            {value}
          </p>
          {subtext && (
            <p className="mt-1 text-xs text-harley-text-muted">{subtext}</p>
          )}
        </div>
        <div
          className={cn(
            "rounded-xl border p-2.5 transition-[transform,box-shadow] duration-200 group-hover:-translate-y-px group-hover:shadow-sm",
            accentStyles[accent]
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface DashboardMetricsProps {
  upcomingCount: number;
  atRiskCount: number;
  avgCompletion: number;
  avgScore: number;
  totalEvents: number;
}

const STAGGER = ["", "animate-stagger-1", "animate-stagger-2", "animate-stagger-3"] as const;

export function DashboardMetrics({
  upcomingCount,
  atRiskCount,
  avgCompletion,
  avgScore,
  totalEvents,
}: DashboardMetricsProps) {
  const cards: MetricCardProps[] = [
    {
      label: "Upcoming Events",
      value: String(upcomingCount),
      subtext: `${totalEvents} total active`,
      icon: <CalendarCheck className="h-5 w-5" aria-hidden />,
      accent: "orange",
    },
    {
      label: "At Risk",
      value: String(atRiskCount),
      subtext: atRiskCount === 0 ? "All on track" : "Need attention",
      icon: <AlertTriangle className="h-5 w-5" aria-hidden />,
      accent: atRiskCount > 0 ? "danger" : "success",
    },
    {
      label: "Avg. Completion",
      value: `${avgCompletion}%`,
      subtext: "Across all events",
      icon: <CheckCircle2 className="h-5 w-5" aria-hidden />,
      accent:
        avgCompletion >= 75 ? "success" : avgCompletion >= 40 ? "orange" : "danger",
    },
    {
      label: "Avg. Event Score",
      value: avgScore.toFixed(1),
      subtext: "Out of 10",
      icon: <Star className="h-5 w-5" aria-hidden />,
      accent: avgScore >= 7 ? "success" : avgScore >= 4 ? "orange" : "danger",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((card, index) => (
        <MetricCard key={card.label} {...card} staggerClass={STAGGER[index]} />
      ))}
    </div>
  );
}
