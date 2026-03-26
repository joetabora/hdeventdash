import { EventStatus } from "@/types/database";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted" | "orange";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-harley-gray text-harley-text-muted border border-harley-gray",
  muted: "bg-harley-black/50 text-harley-text-muted border border-harley-gray",
  success: "bg-harley-success/12 text-harley-success",
  warning: "bg-harley-warning/12 text-harley-warning",
  danger: "bg-harley-danger/12 text-harley-danger",
  orange: "bg-harley-orange/12 text-harley-orange",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
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
  return (
    <Badge variant={statusVariantMap[status]}>{statusLabelMap[status]}</Badge>
  );
}
