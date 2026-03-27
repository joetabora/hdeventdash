"use client";

import { useState, useLayoutEffect, useRef, useEffect } from "react";
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
  /**
   * When true, body content mounts only after the section intersects the viewport (with margin)
   * or the user taps the header. Use with `next/dynamic` children to defer JS and network.
   */
  deferHeavyContent = false,
  /** Passed to IntersectionObserver `rootMargin` when `deferHeavyContent` is set. */
  heavyActivationMargin = "200px",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  autoOpenOnDesktop?: boolean;
  mobileCollapsed?: boolean;
  deferHeavyContent?: boolean;
  heavyActivationMargin?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(
    autoOpenOnDesktop ? false : defaultOpen
  );
  const [heavyReady, setHeavyReady] = useState(!deferHeavyContent);
  const userToggled = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    if (!deferHeavyContent) return;
    if (!open) return;
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setHeavyReady(true);
        }
      },
      { root: null, rootMargin: heavyActivationMargin, threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [deferHeavyContent, open, heavyActivationMargin]);

  const showBody = open && (!deferHeavyContent || heavyReady);

  return (
    <section ref={sectionRef} className="mb-8 md:mb-10">
      <button
        type="button"
        onClick={() => {
          userToggled.current = true;
          if (deferHeavyContent) {
            setHeavyReady(true);
          }
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
      {open && (
        <div className="animate-fade-in-up">
          {showBody ? (
            children
          ) : deferHeavyContent ? (
            <div
              className="rounded-xl border border-harley-gray/40 bg-harley-gray/10 min-h-[7rem] animate-pulse"
              aria-hidden
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
