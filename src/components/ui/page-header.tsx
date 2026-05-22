import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  kicker?: string;
  title: string;
  description?: string | null;
  /** Right-aligned controls (buttons, segmented switchers, links) */
  actions?: React.ReactNode;
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className,
  ...rest
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border-subtle bg-surface-overlay/92 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm sm:p-5 lg:flex lg:items-start lg:justify-between lg:gap-6 animate-page-in",
        className
      )}
      {...rest}
    >
      <div className="min-w-0 space-y-1">
        {kicker ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-harley-orange">
            {kicker}
          </p>
        ) : null}
        <h1 className="font-display-heading text-xl font-semibold tracking-tight text-harley-text sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-harley-text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="mt-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center lg:mt-0">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
