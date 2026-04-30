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
  pam_map_approval_accepted?: boolean;
  asset_requests?: PlaybookMarketingAssetRequest[];
  web_summary?: string | null;
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
  web_page_url?: string | null;
  facebook_event_copy?: string | null;
  canva_web_banner_done?: boolean;
  canva_fb_cover_done?: boolean;
  art_request_form_url?: string | null;
  /** event_media.id for web copy graphic (stored separately from generic marketing_asset uploads). */
  web_graphic_media_id?: string | null;
  /** event_media.id for info-website page banner. */
  page_banner_media_id?: string | null;
};

export const PLAYBOOK_MARKETING_ASSET_CATALOG: readonly {
  key: string;
  label: string;
}[] = [
  { key: "flyer_8_5_11", label: "8.5×11 Flyer" },
  { key: "flyer_2up", label: "2up Flyer" },
  { key: "foamboard_22_28", label: "22×28 Foamboard" },
  { key: "web_banner", label: "Web Banner" },
  { key: "google_banners", label: "Google Banners" },
  { key: "fb_event_1920_1005", label: "1920×1005 FB Event" },
  { key: "fb_cover_828_465", label: "828×465px FB Cover" },
  { key: "fb_status_1200_1200", label: "1200×1200 FB Status" },
  { key: "fb_paid_ad_1080_1080", label: "1080×1080 FB Paid Ad" },
  { key: "ig_stories_1080_1920", label: "1080×1920 IG Stories" },
  { key: "ig_status_1200_1200", label: "1200×1200 IG Status" },
  { key: "eblast_850_500", label: "850×500 Eblast Graphic" },
  { key: "banner_10x3", label: "10'×3' Banner" },
  { key: "atmospheretv_1920_1080", label: "1920×1080 AtmosphereTV" },
  { key: "other", label: "Other (notes)" },
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
  });

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
    /** PAM / map approval accepted (in addition to pam_map_approval_at date). */
    pam_map_approval_accepted: z.boolean().optional(),
    web_graphic_media_id: z.union([z.string().uuid(), z.null()]).optional(),
    page_banner_media_id: z.union([z.string().uuid(), z.null()]).optional(),
  });

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
  const catalogKeys = new Set(
    PLAYBOOK_MARKETING_ASSET_CATALOG.map((a) => a.key)
  );
  const fromCatalog = PLAYBOOK_MARKETING_ASSET_CATALOG.map(({ key }) => {
    const existing = byKey.get(key);
    return {
      key,
      requested: existing?.requested ?? false,
      notes: existing?.notes ?? null,
    };
  });
  const orphan = (stored ?? []).filter(
    (r) => r?.key && !catalogKeys.has(r.key)
  );
  return [...fromCatalog, ...orphan];
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
    pam_map_approval_accepted: false,
    web_graphic_media_id: null,
    page_banner_media_id: null,
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
