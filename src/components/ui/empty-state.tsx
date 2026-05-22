import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Centered illustration for dashboards, feeds, lists, and boards. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-base/38 px-6 py-14 text-center",
        className
      )}
    >
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-surface-overlay/70 shadow-[var(--shadow-card)]">
          <Icon className="h-6 w-6 text-harley-orange" aria-hidden />
        </span>
      ) : null}
      <p className="font-display-heading text-base font-semibold text-harley-text">
        {title}
      </p>
      {description ? (
        <div className="mt-1 max-w-md text-sm leading-relaxed text-harley-text-muted">
          {description}
        </div>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
