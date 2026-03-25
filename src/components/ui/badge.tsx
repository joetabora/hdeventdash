import { EventStatus } from "@/types/database";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "orange";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-harley-gray-lighter/40 text-harley-text-muted",
  success: "bg-harley-success/20 text-harley-success",
  warning: "bg-harley-warning/20 text-harley-warning",
  danger: "bg-harley-danger/20 text-harley-danger",
  info: "bg-harley-info/20 text-harley-info",
  orange: "bg-harley-orange/20 text-harley-orange",
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
  planning: "info",
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
