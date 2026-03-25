"use client";

import { Card } from "@/components/ui/card";
import { CalendarCheck, AlertTriangle, CheckCircle2, Star } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  accent?: "orange" | "danger" | "success" | "info";
}

const accentStyles = {
  orange: "text-harley-orange bg-harley-orange/10",
  danger: "text-harley-danger bg-harley-danger/10",
  success: "text-harley-success bg-harley-success/10",
  info: "text-harley-info bg-harley-info/10",
};

function MetricCard({ label, value, subtext, icon, accent = "orange" }: MetricCardProps) {
  return (
    <Card padding="sm" hover className="group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-harley-text-muted uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-harley-text mt-1">{value}</p>
          {subtext && (
            <p className="text-xs text-harley-text-muted mt-0.5">{subtext}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg transition-transform duration-200 group-hover:scale-110 ${accentStyles[accent]}`}>
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

export function DashboardMetrics({
  upcomingCount,
  atRiskCount,
  avgCompletion,
  avgScore,
  totalEvents,
}: DashboardMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Upcoming Events"
        value={String(upcomingCount)}
        subtext={`${totalEvents} total active`}
        icon={<CalendarCheck className="w-5 h-5" />}
        accent="orange"
      />
      <MetricCard
        label="At Risk"
        value={String(atRiskCount)}
        subtext={atRiskCount === 0 ? "All on track" : "Need attention"}
        icon={<AlertTriangle className="w-5 h-5" />}
        accent={atRiskCount > 0 ? "danger" : "success"}
      />
      <MetricCard
        label="Avg. Completion"
        value={`${avgCompletion}%`}
        subtext="Across all events"
        icon={<CheckCircle2 className="w-5 h-5" />}
        accent={avgCompletion >= 75 ? "success" : avgCompletion >= 40 ? "orange" : "danger"}
      />
      <MetricCard
        label="Avg. Event Score"
        value={avgScore.toFixed(1)}
        subtext="Out of 10"
        icon={<Star className="w-5 h-5" />}
        accent={avgScore >= 7 ? "success" : avgScore >= 4 ? "orange" : "danger"}
      />
    </div>
  );
}
