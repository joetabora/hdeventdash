"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsibleSection({
  icon,
  title,
  count,
  defaultOpen = true,
  mobileCollapsed = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  mobileCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mb-8 md:mb-10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
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
