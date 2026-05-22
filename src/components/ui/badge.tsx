import type { EventStatus } from "@/types/database";

import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted" | "orange";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-surface-overlay/95 text-harley-text-muted ring-1 ring-inset ring-border-subtle shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)]",
  muted:
    "bg-surface-base/72 text-harley-text-muted/95 ring-1 ring-inset ring-border-subtle",
  success:
    "bg-harley-success/[0.12] text-harley-success ring-1 ring-inset ring-harley-success/25",
  warning:
    "bg-harley-warning/[0.12] text-harley-warning ring-1 ring-inset ring-harley-warning/28",
  danger:
    "bg-harley-danger/[0.12] text-harley-danger ring-1 ring-inset ring-harley-danger/25",
  orange:
    "bg-harley-orange/[0.12] text-harley-orange ring-1 ring-inset ring-harley-orange/22",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-tight",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

const statusVariantMap: Record<EventStatus, BadgeVariant> = {
  idea: "default",
  planning: "muted",
  in_progress: "warning",
  ready_for_execution: "orange",
  live_event: "success",
  completed: "success",
};

const statusLabelMap: Record<EventStatus, string> = {
  idea: "Idea",
  planning: "Planning",
  in_progress: "In Progress",
  ready_for_execution: "Ready for Execution",
  live_event: "Live Event",
  completed: "Completed",
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return <Badge variant={statusVariantMap[status]}>{statusLabelMap[status]}</Badge>;
}
