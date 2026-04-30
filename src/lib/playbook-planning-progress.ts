import type { Event } from "@/types/database";
import { getPlaybookMarketing } from "@/lib/playbook-marketing";
import {
  type PlaybookFrameworkLineItem,
  parsePlaybookWorkflow,
} from "@/lib/playbook-workflow";

function nonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function bucketHasLine(items: PlaybookFrameworkLineItem[] | undefined): boolean {
  return (items ?? []).some(
    (row) =>
      nonEmpty(row.name) ||
      nonEmpty(row.description) ||
      (row.cost != null && Number(row.cost) > 0)
  );
}

export type PlaybookPlanningProgress = {
  completed: number;
  total: number;
  percentage: number;
};

/**
 * Discrete planning checkpoints aligned with the embedded playbook editor (Define tab).
 * Each is equally weighted for the header progress bar.
 */
export function computePlaybookPlanningProgress(
  event: Pick<
    Event,
    | "name"
    | "date"
    | "location"
    | "owner"
    | "description"
    | "core_activities"
    | "event_type"
    | "planned_budget"
    | "playbook_workflow"
    | "playbook_marketing"
  >
): PlaybookPlanningProgress {
  const w = parsePlaybookWorkflow(event.playbook_workflow) ?? {};
  const pre = w.pre_event ?? {};
  const fb = w.facebook ?? {};
  const roles = w.roles ?? {};
  const pm = getPlaybookMarketing(event);

  const preChecked = [
    pre.theme_vendors_complete,
    pre.permits_complete,
    pre.publish_sop_complete,
    pre.pam_map_accepted,
    pre.canva_web_banner_downloaded,
    pre.canva_fb_cover_downloaded,
    pre.upload_to_website_complete,
  ].filter(Boolean).length;

  const roleFilled = [
    roles.marketing_lead,
    roles.sales_team,
    roles.service_team,
    roles.motorclothes,
    roles.gm_owner,
    roles.volunteers_charities,
  ].filter((v) => nonEmpty(v)).length;

  const matRows = w.materials_checklist ?? [];
  const materialsTouched =
    matRows.length > 0 &&
    matRows.some((r) => nonEmpty(r.description) || nonEmpty(r.notes));

  const assetRequested =
    (pm.asset_requests ?? []).filter((a) => a.requested).length >= 1;

  const typeOrBudget =
    nonEmpty(event.event_type) ||
    (event.planned_budget != null && Number(event.planned_budget) > 0);

  const checks = [
    nonEmpty(event.name),
    nonEmpty(event.date),
    nonEmpty(event.location),
    nonEmpty(event.core_activities) || nonEmpty(event.description),
    nonEmpty(event.owner),
    typeOrBudget,
    bucketHasLine(w.food_items),
    bucketHasLine(w.entertainment_items),
    bucketHasLine(w.bike_activities_items),
    bucketHasLine(w.engagement_items),
    preChecked >= 3,
    nonEmpty(pm.art_request_sent_at) ||
      nonEmpty(pm.art_finals_received_at) ||
      nonEmpty(pm.pam_map_approval_at),
    assetRequested,
    nonEmpty(pm.web_summary) || nonEmpty(pm.seo_meta_title),
    nonEmpty(fb.name) || nonEmpty(fb.details),
    roleFilled >= 2,
    materialsTouched,
  ] as const;

  const total = checks.length;
  const completed = checks.filter(Boolean).length;
  const percentage =
    total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return { completed, total, percentage };
}
