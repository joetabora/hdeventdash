import type { EventBudgetPeer } from "@/lib/budgets";
import type {
  ChecklistItem,
  Event,
  EventComment,
  EventDocument,
  EventMedia,
  EventVendorWithVendor,
  MonthlyBudget,
  SwapMeetSpot,
} from "@/types/database";

function sortById<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Stable string for remounting `EventDetailClient` when any server-fetched slice changes,
 * even if `event.updated_at` is unchanged (e.g. checklist-only edits).
 */
export function eventDetailBundleFingerprint(input: {
  event: Event;
  checklist: ChecklistItem[];
  documents: EventDocument[];
  comments: EventComment[];
  media: EventMedia[];
  eventVendors: EventVendorWithVendor[];
  budgetPeers: EventBudgetPeer[];
  monthlyBudgetsForEventMonth: MonthlyBudget[];
  swapMeetSpots: SwapMeetSpot[];
}): string {
  const {
    event,
    checklist,
    documents,
    comments,
    media,
    eventVendors,
    budgetPeers,
    monthlyBudgetsForEventMonth,
    swapMeetSpots,
  } = input;

  const parts = [
    event.id,
    event.updated_at,
    JSON.stringify(event.playbook_marketing ?? null),
    JSON.stringify(event.playbook_workflow ?? null),
    event.event_time_start ?? "",
    event.event_time_end ?? "",
    JSON.stringify(
      sortById(checklist).map((c) => ({
        i: c.id,
        x: c.is_checked,
        o: c.sort_order,
        lb: c.label,
        sc: c.section,
        a: c.assignee,
        cm: c.comment,
        ec: c.estimated_cost ?? null,
      }))
    ),
    JSON.stringify(
      sortById(documents).map((d) => [
        d.id,
        d.created_at,
        d.file_name,
        d.tag,
      ])
    ),
    JSON.stringify(
      sortById(comments).map((c) => [
        c.id,
        c.created_at,
        c.content.length,
      ])
    ),
    JSON.stringify(
      sortById(media).map((m) => [
        m.id,
        m.created_at,
        m.file_name,
        m.tag,
      ])
    ),
    JSON.stringify(
      sortById(eventVendors).map((l) => [
        l.id,
        l.updated_at,
        l.detached_at,
        l.participation_status,
        l.role,
      ])
    ),
    JSON.stringify(
      sortById(budgetPeers).map((e) => [
        e.id,
        e.planned_budget,
        e.checklist_estimated_total,
        e.playbook_line_items_total,
      ])
    ),
    JSON.stringify(
      sortById(monthlyBudgetsForEventMonth).map((b) => [
        b.id,
        b.budget_amount,
        b.updated_at,
      ])
    ),
    JSON.stringify(
      sortById(swapMeetSpots).map((s) => [
        s.id,
        s.name,
        s.spot_size,
        s.waiver_file_name,
      ])
    ),
  ];

  return parts.join("\u0001");
}
