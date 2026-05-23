import { format, parseISO } from "date-fns";
import {
  EVENT_STATUSES,
  EVENT_TYPES,
  VENDOR_PARTICIPATION_STATUSES,
  type ChecklistItem,
  type Event,
  type EventVendorWithVendor,
} from "@/types/database";
import { formatUsd } from "@/lib/format-currency";
import {
  formatEngagementGoalLine,
  getPlaybookMarketing,
  mergeAssetRequestsWithCatalog,
  PLAYBOOK_MARKETING_ASSET_CATALOG,
} from "@/lib/playbook-marketing";
import { getPlaybookWorkflow, type PlaybookFrameworkLineItem } from "@/lib/playbook-workflow";
import {
  hasAnyRoiData,
  netRoiProfit,
  roiMoneyVerdict,
  roiPercentOnCost,
  totalRoiRevenue,
} from "@/lib/event-roi";
import type {
  EventReportChecklistRow,
  EventReportDataBundle,
  EventReportLineItem,
  EventReportModel,
  EventReportSection,
  EventReportVendorRow,
} from "@/lib/event-report/types";

function trim(v: string | null | undefined): string {
  return (v ?? "").trim();
}

function hasText(v: string | null | undefined): boolean {
  return trim(v).length > 0;
}

function statusLabel(status: Event["status"]): string {
  return EVENT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function eventTypeLabel(event: Event): string | null {
  if (!event.event_type) return null;
  return EVENT_TYPES.find((t) => t.value === event.event_type)?.label ?? event.event_type;
}

function formatEventDate(event: Event): string {
  try {
    return format(parseISO(event.date), "EEEE, MMMM d, yyyy");
  } catch {
    return event.date;
  }
}

function formatTimeRange(event: Event): string | null {
  const start = trim(event.event_time_start);
  const end = trim(event.event_time_end);
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return end;
  return null;
}

function checklistRows(items: ChecklistItem[]): EventReportChecklistRow[] {
  return items.map((item) => ({
    label: item.label,
    checked: item.is_checked,
    assignee: trim(item.assignee) || undefined,
    comment: trim(item.comment) || undefined,
    estimatedCost:
      item.estimated_cost != null && item.estimated_cost > 0
        ? formatUsd(item.estimated_cost)
        : undefined,
  }));
}

function itemsInSection(
  checklist: ChecklistItem[],
  section: string
): ChecklistItem[] {
  return checklist
    .filter((i) => i.section === section)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function vendorRow(link: EventVendorWithVendor): EventReportVendorRow {
  const v = link.vendor;
  const status =
    VENDOR_PARTICIPATION_STATUSES.find((s) => s.value === link.participation_status)
      ?.label ?? link.participation_status;
  const contact = [v.contact_name, v.email, v.phone].filter(Boolean).join(" · ");
  return {
    name: v.name,
    role: trim(link.role) || trim(v.category) || "Vendor",
    status,
    fee:
      link.agreed_fee != null && link.agreed_fee > 0
        ? formatUsd(link.agreed_fee)
        : undefined,
    contact: contact || undefined,
    notes: trim(link.notes) || trim(v.notes) || undefined,
  };
}

function isSponsorLink(link: EventVendorWithVendor): boolean {
  const hay = `${link.role} ${link.vendor.category} ${link.vendor.name}`.toLowerCase();
  return hay.includes("sponsor");
}

function frameworkLineItems(
  items: PlaybookFrameworkLineItem[] | undefined
): EventReportLineItem[] {
  if (!items?.length) return [];
  return items
    .filter((row) => hasText(row.name) || hasText(row.description) || (row.cost ?? 0) > 0)
    .map((row) => ({
      name: trim(row.name) || "—",
      description: trim(row.description) || undefined,
      cost:
        row.cost != null && Number(row.cost) > 0 ? formatUsd(Number(row.cost)) : undefined,
    }));
}

function sumChecklistCosts(items: ChecklistItem[]): number {
  return items.reduce((acc, i) => acc + (i.estimated_cost ?? 0), 0);
}

function sumFrameworkCosts(event: Event): number {
  const w = getPlaybookWorkflow(event);
  const keys = [
    "food_items",
    "entertainment_items",
    "bike_activities_items",
    "engagement_items",
  ] as const;
  let total = 0;
  for (const key of keys) {
    for (const row of w[key] ?? []) {
      if (row.cost != null && Number(row.cost) > 0) total += Number(row.cost);
    }
  }
  return total;
}

function sumVendorFees(links: EventVendorWithVendor[]): number {
  return links.reduce((acc, l) => acc + (l.agreed_fee ?? 0), 0);
}

export function buildEventReportModel(bundle: EventReportDataBundle): EventReportModel {
  const { event, checklist, documents, media, eventVendors, swapMeetSpots, organizationName } =
    bundle;
  const w = getPlaybookWorkflow(event);
  const pm = getPlaybookMarketing(event);
  const roles = w.roles ?? {};
  const sections: EventReportSection[] = [];

  const overviewRows: { label: string; value: string }[] = [];
  const dateStr = formatEventDate(event);
  const timeStr = formatTimeRange(event);
  overviewRows.push({ label: "Date", value: timeStr ? `${dateStr} · ${timeStr}` : dateStr });
  if (hasText(event.location)) {
    overviewRows.push({ label: "Location", value: event.location.trim() });
  }
  if (hasText(event.owner)) {
    overviewRows.push({ label: "Event owner", value: event.owner.trim() });
  }
  overviewRows.push({ label: "Status", value: statusLabel(event.status) });
  const typeLabel = eventTypeLabel(event);
  if (typeLabel) overviewRows.push({ label: "Event type", value: typeLabel });
  if (event.attendance != null && event.attendance > 0) {
    overviewRows.push({
      label: "Attendance",
      value: event.attendance.toLocaleString(),
    });
  }
  if (event.sales_estimate != null && event.sales_estimate > 0) {
    overviewRows.push({
      label: "Sales estimate",
      value: formatUsd(event.sales_estimate),
    });
  }
  sections.push({ id: "overview", title: "Event overview", rows: overviewRows });

  if (hasText(event.description)) {
    sections.push({
      id: "description",
      title: "Description",
      body: event.description.trim(),
    });
  }

  if (hasText(event.event_goals) || hasText(event.core_activities)) {
    sections.push({
      id: "goals",
      title: "Purpose & goals",
      goals: hasText(event.event_goals) ? event.event_goals!.trim() : undefined,
      coreActivities: hasText(event.core_activities)
        ? event.core_activities!.trim()
        : undefined,
    });
  }

  const weekItems = itemsInSection(checklist, "Event Week Flow");
  if (weekItems.length > 0) {
    sections.push({
      id: "schedule",
      title: "Schedule & run of show",
      groups: [
        {
          heading: "Event week flow",
          items: checklistRows(weekItems),
        },
      ],
    });
  }

  const roleRows: { label: string; value: string }[] = [];
  const roleMap: [string, string | null | undefined][] = [
    ["Marketing lead", roles.marketing_lead],
    ["Sales team", roles.sales_team],
    ["Service team", roles.service_team],
    ["MotorClothes", roles.motorclothes],
    ["GM / Owner", roles.gm_owner],
    ["Volunteers / charities", roles.volunteers_charities],
  ];
  for (const [label, value] of roleMap) {
    if (hasText(value)) roleRows.push({ label, value: value!.trim() });
  }
  const rolesChecklist = itemsInSection(checklist, "Roles & Responsibilities");
  for (const item of rolesChecklist) {
    if (hasText(item.assignee) || item.is_checked) {
      roleRows.push({
        label: item.label,
        value: item.is_checked
          ? trim(item.assignee) || "Assigned"
          : trim(item.assignee) || "Pending",
      });
    }
  }
  if (roleRows.length > 0) {
    sections.push({ id: "staffing", title: "Staffing & roles", rows: roleRows });
  }

  const vendorLinks = eventVendors.filter((l) => !isSponsorLink(l));
  const sponsorLinks = eventVendors.filter(isSponsorLink);
  if (vendorLinks.length > 0) {
    sections.push({
      id: "vendors",
      title: "Vendors",
      rows: vendorLinks.map(vendorRow),
    });
  }
  if (sponsorLinks.length > 0) {
    sections.push({
      id: "sponsors",
      title: "Sponsors",
      rows: sponsorLinks.map(vendorRow),
    });
  }

  const budgetRows: { label: string; value: string }[] = [];
  const lineItems: EventReportLineItem[] = [
    ...frameworkLineItems(w.food_items),
    ...frameworkLineItems(w.entertainment_items),
    ...frameworkLineItems(w.bike_activities_items),
    ...frameworkLineItems(w.engagement_items),
  ];
  if (event.planned_budget != null && event.planned_budget > 0) {
    budgetRows.push({ label: "Planned budget", value: formatUsd(event.planned_budget) });
  }
  if (event.actual_budget != null && event.actual_budget > 0) {
    budgetRows.push({ label: "Actual spend", value: formatUsd(event.actual_budget) });
  }
  const checklistCost = sumChecklistCosts(checklist);
  if (checklistCost > 0) {
    budgetRows.push({
      label: "Checklist line estimates",
      value: formatUsd(checklistCost),
    });
  }
  const frameworkTotal = sumFrameworkCosts(event);
  if (frameworkTotal > 0) {
    budgetRows.push({
      label: "Activity framework (est.)",
      value: formatUsd(frameworkTotal),
    });
  }
  const vendorFees = sumVendorFees(eventVendors);
  if (vendorFees > 0) {
    budgetRows.push({ label: "Agreed vendor fees", value: formatUsd(vendorFees) });
  }
  if (budgetRows.length > 0 || lineItems.length > 0) {
    sections.push({
      id: "budget",
      title: "Budget & spend",
      rows: budgetRows,
      lineItems,
    });
  }

  const kpiRows: { label: string; value: string }[] = [];
  const engagement = formatEngagementGoalLine(event);
  if (engagement) kpiRows.push({ label: "Engagement goal", value: engagement });
  if (event.roi_leads_generated != null && event.roi_leads_generated > 0) {
    kpiRows.push({
      label: "Leads generated",
      value: String(event.roi_leads_generated),
    });
  }
  if (event.roi_bikes_sold != null && event.roi_bikes_sold > 0) {
    kpiRows.push({ label: "Bikes sold", value: String(event.roi_bikes_sold) });
  }
  if (hasAnyRoiData(event)) {
    if (totalRoiRevenue(event) > 0) {
      kpiRows.push({ label: "Tracked revenue", value: formatUsd(totalRoiRevenue(event)) });
    }
    if ((event.roi_event_cost ?? 0) > 0) {
      kpiRows.push({ label: "Event cost", value: formatUsd(event.roi_event_cost!) });
    }
    const net = netRoiProfit(event);
    if (net !== 0 || totalRoiRevenue(event) > 0) {
      kpiRows.push({ label: "Net (est.)", value: formatUsd(net) });
    }
    const pct = roiPercentOnCost(event);
    if (pct != null) {
      kpiRows.push({ label: "ROI on cost", value: `${pct.toFixed(1)}%` });
    }
  }
  const metricsItems = itemsInSection(checklist, "Metrics for Success");
  const metricsDone = metricsItems.filter((i) => i.is_checked).length;
  if (metricsItems.length > 0) {
    kpiRows.push({
      label: "Success metrics tracked",
      value: `${metricsDone} of ${metricsItems.length} complete`,
    });
  }
  if (kpiRows.length > 0) {
    sections.push({
      id: "kpis",
      title: "KPIs & outcomes",
      rows: kpiRows,
      highlight: hasAnyRoiData(event) ? roiMoneyVerdict(event).label : undefined,
    });
  }

  const marketingBlocks: { heading: string; body: string }[] = [];
  if (hasText(pm.web_summary)) {
    marketingBlocks.push({ heading: "Web summary", body: pm.web_summary!.trim() });
  }
  if (hasText(pm.seo_meta_title) || hasText(pm.seo_meta_description)) {
    marketingBlocks.push({
      heading: "SEO",
      body: [pm.seo_meta_title, pm.seo_meta_description].filter(hasText).join("\n\n"),
    });
  }
  if (hasText(pm.web_page_url)) {
    marketingBlocks.push({ heading: "Public page", body: pm.web_page_url!.trim() });
  }
  if (hasText(pm.facebook_event_copy)) {
    marketingBlocks.push({
      heading: "Facebook event copy",
      body: pm.facebook_event_copy!.trim(),
    });
  }
  if (hasText(w.facebook?.details)) {
    marketingBlocks.push({
      heading: "Facebook details",
      body: w.facebook!.details!.trim(),
    });
  }
  if (hasText(w.web_extra?.page_copy)) {
    marketingBlocks.push({
      heading: "Website page copy",
      body: w.web_extra!.page_copy!.trim(),
    });
  }
  if (hasText(event.giveaway_description)) {
    marketingBlocks.push({
      heading: "Giveaway",
      body: [event.giveaway_description, event.giveaway_link].filter(hasText).join("\n"),
    });
  }
  if (hasText(event.rsvp_incentive)) {
    marketingBlocks.push({
      heading: "RSVP incentive",
      body: [event.rsvp_incentive, event.rsvp_link].filter(hasText).join("\n"),
    });
  }
  const requestedAssets = mergeAssetRequestsWithCatalog(pm.asset_requests).filter(
    (a) => a.requested
  );
  if (requestedAssets.length > 0) {
    const catalog = new Map(
      PLAYBOOK_MARKETING_ASSET_CATALOG.map((a) => [a.key, a.label])
    );
    marketingBlocks.push({
      heading: "Marketing assets requested",
      body: requestedAssets
        .map((a) => {
          const label = catalog.get(a.key) ?? a.key;
          return a.notes?.trim() ? `${label} — ${a.notes.trim()}` : label;
        })
        .join("\n"),
    });
  }
  if (marketingBlocks.length > 0) {
    sections.push({ id: "marketing", title: "Marketing", blocks: marketingBlocks });
  }

  const logisticsRows: { label: string; value: string }[] = [];
  const pre = w.pre_event ?? {};
  const preLabels: [string, boolean | undefined][] = [
    ["Theme & vendors finalized", pre.theme_vendors_complete],
    ["Permits complete", pre.permits_complete],
    ["Publish SOP complete", pre.publish_sop_complete],
    ["PAM map accepted", pre.pam_map_accepted],
    ["Canva web banner downloaded", pre.canva_web_banner_downloaded],
    ["Canva FB cover downloaded", pre.canva_fb_cover_downloaded],
    ["Uploaded to website", pre.upload_to_website_complete],
  ];
  for (const [label, done] of preLabels) {
    if (done) logisticsRows.push({ label, value: "Complete" });
  }
  const materialsRows = w.materials_checklist ?? [];
  const materialChecklist = itemsInSection(checklist, "Checklist / Materials");
  const preEventChecklist = itemsInSection(checklist, "Pre-Event Preparation");
  if (logisticsRows.length > 0 || materialsRows.length > 0 || preEventChecklist.length > 0) {
    sections.push({
      id: "logistics",
      title: "Logistics & preparation",
      rows: logisticsRows,
      materials: [
        ...materialsRows
          .filter((m) => hasText(m.item) || hasText(m.description) || hasText(m.notes))
          .map((m) => ({
            label: trim(m.item) || "Material",
            checked: true,
            comment: [m.description, m.notes].filter(hasText).join(" · ") || undefined,
          })),
        ...checklistRows(preEventChecklist),
      ],
    });
  }

  const waiverDocs = documents.filter((d) => d.tag === "liability_waiver");
  if (waiverDocs.length > 0) {
    sections.push({
      id: "safety",
      title: "Safety & compliance",
      items: waiverDocs.map((d) => d.file_name),
    });
  }

  if (materialChecklist.length > 0) {
    sections.push({
      id: "materials",
      title: "Materials & assets checklist",
      items: checklistRows(materialChecklist),
    });
  }

  if (swapMeetSpots.length > 0) {
    sections.push({
      id: "swapMeet",
      title: "Swap meet",
      spots: swapMeetSpots.map((s) => ({
        name: s.name,
        size: s.spot_size,
        contact: [s.phone, s.email].filter(Boolean).join(" · ") || "—",
      })),
    });
  }

  if (hasText(event.planning_notes) || hasText(event.recap_notes)) {
    sections.push({
      id: "notes",
      title: "Notes",
      planning: hasText(event.planning_notes) ? event.planning_notes!.trim() : undefined,
      recap: hasText(event.recap_notes) ? event.recap_notes!.trim() : undefined,
    });
  }

  const reportMedia = media.filter(
    (m) =>
      m.tag === "marketing_asset" ||
      m.tag === "social_media" ||
      m.tag === "recap"
  );
  if (reportMedia.length > 0) {
    sections.push({
      id: "images",
      title: "Event imagery",
      images: reportMedia.map((m) => ({
        mediaId: m.id,
        caption: m.file_name,
        filePath: m.file_path,
      })),
    });
  }

  const analyticsRows: { label: string; value: string }[] = [];
  const totalChecklist = checklist.length;
  const doneChecklist = checklist.filter((i) => i.is_checked).length;
  if (totalChecklist > 0) {
    analyticsRows.push({
      label: "Checklist completion",
      value: `${Math.round((doneChecklist / totalChecklist) * 100)}% (${doneChecklist}/${totalChecklist})`,
    });
  }
  if (event.attendance != null) {
    analyticsRows.push({
      label: "Recorded attendance",
      value: event.attendance.toLocaleString(),
    });
  }
  if (hasAnyRoiData(event) && totalRoiRevenue(event) > 0) {
    analyticsRows.push({
      label: "Total tracked revenue",
      value: formatUsd(totalRoiRevenue(event)),
    });
  }
  if (analyticsRows.length > 0) {
    sections.push({ id: "analytics", title: "Analytics snapshot", rows: analyticsRows });
  }

  return {
    generatedAtIso: new Date().toISOString(),
    organizationName,
    eventTitle: event.name,
    eventStatusLabel: statusLabel(event.status),
    eventTypeLabel: typeLabel,
    sections,
  };
}
