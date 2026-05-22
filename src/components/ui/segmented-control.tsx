"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

export interface SegmentedControlOption<V extends string> {
  id: V;
  label: string;
  icon?: LucideIcon;
  /** Accessible label fallback when icon-only on narrow screens uses label */
}

interface SegmentedControlProps<V extends string> {
  options: SegmentedControlOption<V>[];
  value: V;
  onChange: (next: V) => void;
  /** Show labels from `sm` breakpoint; below that icon-only where icon exists */
  showLabelBreakpoint?: "md" | "sm" | "lg";
  className?: string;
}

export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  showLabelBreakpoint = "md",
  className,
}: SegmentedControlProps<V>) {
  const labelHidden =
    showLabelBreakpoint === "md"
      ? "hidden md:inline"
      : showLabelBreakpoint === "sm"
        ? "hidden sm:inline"
        : "hidden lg:inline";

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "grid grid-cols-4 gap-0.5 rounded-lg border border-border-subtle bg-surface-base/45 p-0.5",
        className
      )}
    >
      {options.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex h-9 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium transition-[color,background-color,box-shadow] duration-200",
              active
                ? "bg-harley-orange/95 text-white shadow-[0_1px_0_rgb(0_0_0/0.2),0_0_0_1px_rgb(255_102_0/0.25)]"
                : "text-harley-text-muted hover:bg-surface-raised/80 hover:text-harley-text"
            )}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
            <span className={cn("min-w-0 truncate", Icon ? labelHidden : "")}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
