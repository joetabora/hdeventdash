"use client";

import {
  PLAYBOOK_PHASE_IDS,
  PLAYBOOK_PHASE_LABELS,
  type PlaybookPhaseId,
} from "@/lib/playbook-phases";

export function PlaybookPhaseNav({
  activePhase,
  onPhaseChange,
}: {
  activePhase: PlaybookPhaseId;
  onPhaseChange: (phase: PlaybookPhaseId) => void;
}) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin] -mx-1 px-1"
      aria-label="Event playbook phases"
    >
      {PLAYBOOK_PHASE_IDS.map((id) => {
        const active = id === activePhase;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onPhaseChange(id)}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border ${
              active
                ? "bg-harley-orange/20 border-harley-orange/50 text-harley-orange"
                : "bg-harley-black/30 border-harley-gray/40 text-harley-text-muted hover:text-harley-text hover:border-harley-gray"
            }`}
          >
            {PLAYBOOK_PHASE_LABELS[id]}
          </button>
        );
      })}
    </nav>
  );
}
