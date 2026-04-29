import { z } from "zod";
import type { Event } from "@/types/database";

/** Single marketing asset row (aligned with Event Playbook asset list). */
export type PlaybookMarketingAssetRequest = {
  key: string;
  requested: boolean;
  notes?: string | null;
};

export type PlaybookMarketing = {
  engagement_goal_label?: string | null;
  engagement_goal_target?: number | null;
  art_request_sent_at?: string | null;
  art_finals_received_at?: string | null;
  pam_map_approval_at?: string | null;
  asset_requests?: PlaybookMarketingAssetRequest[];
  web_summary?: string | null;
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
  web_page_url?: string | null;
  facebook_event_copy?: string | null;
  canva_web_banner_done?: boolean;
  canva_fb_cover_done?: boolean;
  art_request_form_url?: string | null;
};

export const PLAYBOOK_MARKETING_ASSET_CATALOG: readonly {
  key: string;
  label: string;
}[] = [
  { key: "flyer_8_5_11", label: "8.5×11 flyer" },
  { key: "flyer_2up", label: "2-up flyer" },
  { key: "poster", label: "Poster" },
  { key: "web_banner", label: "Web / Google display banner" },
  { key: "google_banners_set", label: "Google Ads banner set" },
  { key: "facebook_ig_square", label: "Facebook / IG square (1200×1200)" },
  { key: "instagram_story", label: "Instagram story (1080×1920)" },
  { key: "email_blast_graphic", label: "E-blast header graphic" },
  { key: "tv_slide", label: "In-store TV slide" },
  { key: "print_menu_board", label: "Counter / menu-board graphic" },
  { key: "window_cling", label: "Window cling / decal" },
  { key: "yard_sign", label: "Yard / A-frame sign" },
  { key: "ticket_flyer", label: "Ticket / handout variant" },
  { key: "ride_map_graphic", label: "Ride map or directional graphic" },
  { key: "misc_other", label: "Other (notes)" },
] as const;

const optionalYmd = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.literal(""),
    z.null(),
  ])
  .optional();

const assetRowSchema = z
  .object({
    key: z.string().max(100),
    requested: z.boolean(),
    notes: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .strict();

/** Validates PATCH body / persisted JSON. */
export const playbookMarketingSchema = z
  .object({
    engagement_goal_label: z.union([z.string().max(200), z.null()]).optional(),
    engagement_goal_target: z
      .union([z.number().int().min(0).max(1_000_000_000), z.null()])
      .optional(),
    art_request_sent_at: optionalYmd,
    art_finals_received_at: optionalYmd,
    pam_map_approval_at: optionalYmd,
    asset_requests: z.array(assetRowSchema).max(80).optional(),
    web_summary: z.union([z.string().max(20000), z.null()]).optional(),
    seo_meta_title: z.union([z.string().max(500), z.null()]).optional(),
    seo_meta_description: z.union([z.string().max(2000), z.null()]).optional(),
    web_page_url: z.union([z.string().max(2000), z.null()]).optional(),
    facebook_event_copy: z.union([z.string().max(20000), z.null()]).optional(),
    canva_web_banner_done: z.boolean().optional(),
    canva_fb_cover_done: z.boolean().optional(),
    art_request_form_url: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .strict();

export function normalizePlaybookMarketingDates(
  m: PlaybookMarketing
): PlaybookMarketing {
  const next = { ...m };
  const keys: (keyof PlaybookMarketing)[] = [
    "art_request_sent_at",
    "art_finals_received_at",
    "pam_map_approval_at",
  ];
  for (const k of keys) {
    const v = next[k];
    if (v === "")
      (next as Record<(typeof keys)[number], string | null | undefined>)[k] =
        null;
  }
  return next;
}

export function parsePlaybookMarketing(
  raw: unknown
): PlaybookMarketing | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = playbookMarketingSchema.safeParse(raw);
  return r.success ? normalizePlaybookMarketingDates(r.data) : null;
}

/** Merges stored rows with catalog so new keys appear in the UI. */
export function mergeAssetRequestsWithCatalog(
  stored: PlaybookMarketingAssetRequest[] | null | undefined
): PlaybookMarketingAssetRequest[] {
  const byKey = new Map<string, PlaybookMarketingAssetRequest>();
  for (const row of stored ?? []) {
    if (row?.key) byKey.set(row.key, { ...row });
  }
  return PLAYBOOK_MARKETING_ASSET_CATALOG.map(({ key }) => {
    const existing = byKey.get(key);
    return {
      key,
      requested: existing?.requested ?? false,
      notes: existing?.notes ?? null,
    };
  });
}

export function defaultPlaybookMarketing(): PlaybookMarketing {
  return {
    engagement_goal_label: null,
    engagement_goal_target: null,
    art_request_sent_at: null,
    art_finals_received_at: null,
    pam_map_approval_at: null,
    asset_requests: mergeAssetRequestsWithCatalog([]),
    web_summary: null,
    seo_meta_title: null,
    seo_meta_description: null,
    web_page_url: null,
    facebook_event_copy: null,
    canva_web_banner_done: false,
    canva_fb_cover_done: false,
    art_request_form_url: null,
  };
}

export function getPlaybookMarketing(
  source: Pick<Event, "playbook_marketing">
): PlaybookMarketing {
  const parsed = parsePlaybookMarketing(source.playbook_marketing);
  const base = parsed ?? {};
  return {
    ...defaultPlaybookMarketing(),
    ...base,
    asset_requests: mergeAssetRequestsWithCatalog(base.asset_requests),
  };
}

export function formatEngagementGoalLine(
  event: Pick<Event, "playbook_marketing">
): string | null {
  const pm = getPlaybookMarketing(event);
  const label = pm.engagement_goal_label?.trim();
  const target = pm.engagement_goal_target;
  if (label && target != null && Number.isFinite(target)) {
    return `${target.toLocaleString()} ${label}`;
  }
  if (label) return label;
  if (target != null && Number.isFinite(target)) return String(target);
  return null;
}

export function effectiveArtRequestFormUrl(
  event: Pick<Event, "playbook_marketing">,
  orgDefault: string | null | undefined
): string | null {
  const pm = getPlaybookMarketing(event);
  const o = orgDefault?.trim();
  const per = pm.art_request_form_url?.trim();
  if (per) return per;
  if (o) return o;
  return null;
}
