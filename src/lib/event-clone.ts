import type { ChecklistItem, Event, EventVendor } from "@/types/database";
import {
  parsePlaybookMarketing,
  type PlaybookMarketing,
} from "@/lib/playbook-marketing";
import {
  parsePlaybookWorkflow,
  type PlaybookWorkflow,
} from "@/lib/playbook-workflow";

/**
 * Builders for the "Duplicate event" flow.
 *
 * Copy rules: planning *content* (framework items, copy prompts, budgets,
 * checklist structure, vendor lineup) carries over; per-run *state and
 * outcomes* (checkmarks, sent/approved dates, recap, ROI, media references)
 * reset so the clone starts as a fresh plan.
 */

/** Workflow JSON for the clone: keep content, reset pre-event checkpoints. */
export function clonePlaybookWorkflow(raw: unknown): PlaybookWorkflow | null {
  const source = parsePlaybookWorkflow(raw);
  if (!source) return null;
  return {
    ...source,
    pre_event: {},
  };
}

/**
 * Marketing JSON for the clone: keep goals, asset selections, and copy
 * drafts; reset workflow dates, approvals, and uploaded-media references
 * (media files are not copied).
 */
export function clonePlaybookMarketing(raw: unknown): PlaybookMarketing | null {
  const source = parsePlaybookMarketing(raw);
  if (!source) return null;
  return {
    ...source,
    art_request_sent_at: null,
    art_finals_received_at: null,
    pam_map_approval_at: null,
    pam_map_approval_accepted: false,
    canva_web_banner_done: false,
    canva_fb_cover_done: false,
    web_page_url: null,
    web_graphic_media_id: null,
    page_banner_media_id: null,
  };
}

export type CloneEventInsert = Record<string, unknown>;

/** Insert payload for the cloned event row. */
export function buildCloneEventInsert(
  source: Event,
  opts: { name: string; date: string; userId: string }
): CloneEventInsert {
  return {
    name: opts.name,
    date: opts.date,
    location: source.location,
    owner: source.owner,
    status: "planning",
    description: source.description,
    onedrive_link: source.onedrive_link,
    user_id: opts.userId,
    organization_id: source.organization_id,
    event_type: source.event_type ?? null,
    planned_budget: source.planned_budget ?? null,
    event_goals: source.event_goals ?? null,
    core_activities: source.core_activities ?? null,
    giveaway_description: source.giveaway_description ?? null,
    giveaway_link: source.giveaway_link ?? null,
    rsvp_incentive: source.rsvp_incentive ?? null,
    rsvp_link: source.rsvp_link ?? null,
    has_swap_meet: source.has_swap_meet ?? false,
    event_time_start: source.event_time_start ?? null,
    event_time_end: source.event_time_end ?? null,
    playbook_workflow: clonePlaybookWorkflow(source.playbook_workflow),
    playbook_marketing: clonePlaybookMarketing(source.playbook_marketing),
    // Per-run state/outcomes intentionally reset: actual_budget, attendance,
    // recap_notes, planning_notes, sales_estimate, ROI fields, is_archived,
    // is_live_mode all start at their column defaults.
  };
}

/** Checklist rows for the clone: same structure/costs, all unchecked. */
export function buildCloneChecklistRows(
  items: Pick<
    ChecklistItem,
    "section" | "label" | "assignee" | "estimated_cost" | "sort_order"
  >[],
  newEventId: string
): Record<string, unknown>[] {
  return items.map((item) => ({
    event_id: newEventId,
    section: item.section,
    label: item.label,
    assignee: item.assignee,
    estimated_cost: item.estimated_cost,
    sort_order: item.sort_order,
    is_checked: false,
    comment: "",
  }));
}

/** Vendor links for the clone: same lineup/fees, status back to invited. */
export function buildCloneVendorRows(
  links: Pick<
    EventVendor,
    "vendor_id" | "role" | "notes" | "agreed_fee" | "fee_notes" | "detached_at"
  >[],
  newEventId: string
): Record<string, unknown>[] {
  return links
    .filter((link) => link.detached_at == null)
    .map((link) => ({
      event_id: newEventId,
      vendor_id: link.vendor_id,
      role: link.role,
      notes: link.notes,
      agreed_fee: link.agreed_fee,
      fee_notes: link.fee_notes,
      participation_status: "invited",
    }));
}
