import type { OpsFeedPriority } from "@/types/database";
import { Badge } from "@/components/ui/badge";

const priorityVariant: Record<
  OpsFeedPriority,
  "default" | "muted" | "warning" | "danger"
> = {
  low: "muted",
  normal: "default",
  high: "warning",
  urgent: "danger",
};

const priorityLabel: Record<OpsFeedPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export function OpsFeedPriorityBadge({
  priority,
}: {
  priority: OpsFeedPriority;
}) {
  if (priority === "normal") return null;
  return (
    <Badge variant={priorityVariant[priority]}>{priorityLabel[priority]}</Badge>
  );
}

export function opsFeedPriorityDotClass(priority: OpsFeedPriority): string {
  switch (priority) {
    case "urgent":
      return "bg-harley-danger";
    case "high":
      return "bg-harley-warning";
    case "low":
      return "bg-harley-text-muted/40";
    default:
      return "bg-transparent";
  }
}
