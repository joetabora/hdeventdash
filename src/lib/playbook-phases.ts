import type { ChecklistSection } from "@/types/database";

export const PLAYBOOK_PHASE_IDS = [
  "define",
  "prepare",
  "market",
  "week",
  "after",
  "supporting",
] as const;

export type PlaybookPhaseId = (typeof PLAYBOOK_PHASE_IDS)[number];

export const PLAYBOOK_PHASE_LABELS: Record<PlaybookPhaseId, string> = {
  define: "Define",
  prepare: "Prepare",
  market: "Market & publish",
  week: "Week & day-of",
  after: "After",
  supporting: "Supporting",
};

/** Checklist sections shown under Prepare (Playbook pre-event + materials). */
export const PLAYBOOK_PREPARE_SECTIONS: readonly ChecklistSection[] = [
  "Pre-Event Preparation",
  "Checklist / Materials",
];

/** Event week flow only. */
export const PLAYBOOK_WEEK_SECTIONS: readonly ChecklistSection[] = [
  "Event Week Flow",
];

/** Post-event, roles, metrics. */
export const PLAYBOOK_AFTER_SECTIONS: readonly ChecklistSection[] = [
  "Post-Event Follow-Up",
  "Roles & Responsibilities",
  "Metrics for Success",
];
