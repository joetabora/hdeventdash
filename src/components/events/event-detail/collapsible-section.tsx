"use client";

import { useState, useLayoutEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

const MD_MIN = "(min-width: 768px)";

export function CollapsibleSection({
  icon,
  title,
  count,
  /** Used when `autoOpenOnDesktop` is false. */
  defaultOpen = true,
  /**
   * When true: closed on SSR/first paint, then opens on ≥768px before paint (layout effect).
   * Reacts to viewport crossing the breakpoint. No `window` in render.
   */
  autoOpenOnDesktop = false,
  mobileCollapsed = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  autoOpenOnDesktop?: boolean;
  mobileCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(
    autoOpenOnDesktop ? false : defaultOpen
  );
  const userToggled = useRef(false);

  useLayoutEffect(() => {
    if (!autoOpenOnDesktop) return;
    const mq = window.matchMedia(MD_MIN);
    const apply = () => {
      if (!userToggled.current) {
        setOpen(mq.matches);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [autoOpenOnDesktop]);

  return (
    <section className="mb-8 md:mb-10">
      <button
        type="button"
        onClick={() => {
          userToggled.current = true;
          setOpen((o) => !o);
        }}
        className="flex items-center gap-2.5 mb-4 w-full group"
      >
        <span className="text-harley-text-muted">{icon}</span>
        <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide">
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-xs text-harley-text-muted bg-harley-gray-light/50 rounded-full px-2 py-0.5">
            {count}
          </span>
        )}
        <div className="flex-1 border-t border-harley-gray/40 ml-2" />
        <ChevronDown
          className={`w-4 h-4 text-harley-text-muted transition-transform duration-200 ${
            open ? "rotate-0" : "-rotate-90"
          } ${mobileCollapsed ? "md:hidden" : ""}`}
        />
      </button>
      {open && <div className="animate-fade-in-up">{children}</div>}
    </section>
  );
}
