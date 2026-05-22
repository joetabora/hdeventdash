import { forwardRef, HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type CardPadding = "none" | "xs" | "sm" | "md" | "lg" | "xl";

type CardVariant = "solid" | "glass";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  hover?: boolean;
  interactive?: boolean;
  variant?: CardVariant;
}

const paddingStyles: Record<CardPadding, string> = {
  none: "",
  xs: "p-3.5",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
  xl: "p-8",
};

const variantShell: Record<CardVariant, string> = {
  solid:
    "bg-surface-overlay/95 backdrop-blur-sm border-border-subtle before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:p-px before:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)] relative",
  glass:
    "bg-surface-raised/40 backdrop-blur-xl border-white/[0.06] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/[0.04] before:to-transparent relative",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      padding = "md",
      hover = false,
      interactive = false,
      variant = "solid",
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border shadow-[var(--shadow-card)] transition-all duration-200",
          variantShell[variant],
          paddingStyles[padding],
          hover &&
            "hover:border-harley-text-muted/25 hover:shadow-[var(--shadow-elevated)] hover:-translate-y-px",
          interactive && "cursor-pointer active:scale-[0.995] active:translate-y-0",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("pb-4 border-b border-border-subtle mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("font-semibold text-harley-text font-display-heading", className)}>
      {children}
    </h3>
  );
}
