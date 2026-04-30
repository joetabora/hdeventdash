import { z } from "zod";
import type { Event } from "@/types/database";
import { BUDGET_AMOUNT_MAX } from "@/lib/validation/api-schemas";

const moneyNonneg = z.number().finite().min(0).max(BUDGET_AMOUNT_MAX);

export type PlaybookFrameworkLineItem = {
  name?: string | null;
  description?: string | null;
  cost?: number | null;
};

export type PlaybookMaterialRow = {
  item: string;
  description?: string | null;
  notes?: string | null;
};

export type PlaybookWorkflow = {
  /** Checkbox-style pre-event + publishing checkpoints */
  pre_event?: {
    theme_vendors_complete?: boolean;
    permits_complete?: boolean;
    publish_sop_complete?: boolean;
    pam_map_accepted?: boolean;
    canva_web_banner_downloaded?: boolean;
    canva_fb_cover_downloaded?: boolean;
    upload_to_website_complete?: boolean;
  };
  food_items?: PlaybookFrameworkLineItem[];
  entertainment_items?: PlaybookFrameworkLineItem[];
  bike_activities_items?: PlaybookFrameworkLineItem[];
  engagement_items?: PlaybookFrameworkLineItem[];
  copy_prompts?: {
    event_name?: string | null;
    location?: string | null;
    event_date_text?: string | null;
    who_its_for?: string | null;
    food?: string | null;
    entertainment?: string | null;
    perks_discounts?: string | null;
    tone?: string | null;
    phrases?: string | null;
    rsvp_notes?: string | null;
  };
  web_extra?: {
    page_copy?: string | null;
  };
  facebook?: {
    name?: string | null;
    details?: string | null;
  };
  roles?: {
    marketing_lead?: string | null;
    sales_team?: string | null;
    service_team?: string | null;
    motorclothes?: string | null;
    gm_owner?: string | null;
    volunteers_charities?: string | null;
  };
  materials_checklist?: PlaybookMaterialRow[];
};

const lineItemSchema = z
  .object({
    name: z.union([z.string().max(500), z.null()]).optional(),
    description: z.union([z.string().max(4000), z.null()]).optional(),
    cost: z.union([moneyNonneg, z.null()]).optional(),
  })
  .strict();

const materialRowSchema = z
  .object({
    item: z.string().max(120),
    description: z.union([z.string().max(2000), z.null()]).optional(),
    notes: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .strict();

export const playbookWorkflowSchema = z
  .object({
    pre_event: z
      .object({
        theme_vendors_complete: z.boolean().optional(),
        permits_complete: z.boolean().optional(),
        publish_sop_complete: z.boolean().optional(),
        pam_map_accepted: z.boolean().optional(),
        canva_web_banner_downloaded: z.boolean().optional(),
        canva_fb_cover_downloaded: z.boolean().optional(),
        upload_to_website_complete: z.boolean().optional(),
      })
      .strict()
      .optional(),
    food_items: z.array(lineItemSchema).max(50).optional(),
    entertainment_items: z.array(lineItemSchema).max(50).optional(),
    bike_activities_items: z.array(lineItemSchema).max(50).optional(),
    engagement_items: z.array(lineItemSchema).max(50).optional(),
    copy_prompts: z
      .object({
        event_name: z.union([z.string().max(500), z.null()]).optional(),
        location: z.union([z.string().max(500), z.null()]).optional(),
        event_date_text: z.union([z.string().max(200), z.null()]).optional(),
        who_its_for: z.union([z.string().max(1000), z.null()]).optional(),
        food: z.union([z.string().max(4000), z.null()]).optional(),
        entertainment: z.union([z.string().max(4000), z.null()]).optional(),
        perks_discounts: z.union([z.string().max(4000), z.null()]).optional(),
        tone: z.union([z.string().max(500), z.null()]).optional(),
        phrases: z.union([z.string().max(2000), z.null()]).optional(),
        rsvp_notes: z.union([z.string().max(2000), z.null()]).optional(),
      })
      .strict()
      .optional(),
    web_extra: z
      .object({
        page_copy: z.union([z.string().max(50000), z.null()]).optional(),
      })
      .strict()
      .optional(),
    facebook: z
      .object({
        name: z.union([z.string().max(500), z.null()]).optional(),
        details: z.union([z.string().max(50000), z.null()]).optional(),
      })
      .strict()
      .optional(),
    roles: z
      .object({
        marketing_lead: z.union([z.string().max(2000), z.null()]).optional(),
        sales_team: z.union([z.string().max(2000), z.null()]).optional(),
        service_team: z.union([z.string().max(2000), z.null()]).optional(),
        motorclothes: z.union([z.string().max(2000), z.null()]).optional(),
        gm_owner: z.union([z.string().max(2000), z.null()]).optional(),
        volunteers_charities: z.union([z.string().max(2000), z.null()]).optional(),
      })
      .strict()
      .optional(),
    materials_checklist: z.array(materialRowSchema).max(80).optional(),
  })
  .strict();

export const PLAYBOOK_MATERIALS_ITEM_LABELS: readonly string[] = [
  "Tent",
  "Table",
  "Tablecloth",
  "Chairs",
  "Graphic (FB)",
  "Graphic (IG)",
  "Web Banner",
  "Email graphic",
  "Email Script",
  "Phone Script",
  "Text Script",
  "Text Blast",
  "Motorcycle",
  "Flyers",
  "Bounce Back Cash",
  "Giveaway Keyword Set Up",
  "Giveaway Item",
  "Other Swag",
  "Ipad",
  "Poster Sign/Holder",
  "Guitar",
  "Balloons",
  "Flags",
] as const;

export function defaultMaterialsChecklist(): PlaybookMaterialRow[] {
  return PLAYBOOK_MATERIALS_ITEM_LABELS.map((item) => ({
    item,
    description: null,
    notes: null,
  }));
}

export function defaultEmptyPlaybookWorkflow(): PlaybookWorkflow {
  return {
    pre_event: {},
    food_items: [],
    entertainment_items: [],
    bike_activities_items: [],
    engagement_items: [],
    copy_prompts: {},
    web_extra: {},
    facebook: {},
    roles: {},
    materials_checklist: defaultMaterialsChecklist(),
  };
}

export function parsePlaybookWorkflow(raw: unknown): PlaybookWorkflow | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const p = playbookWorkflowSchema.safeParse(raw);
  return p.success ? p.data : null;
}

export function getPlaybookWorkflow(
  source: Pick<Event, "playbook_workflow">
): PlaybookWorkflow {
  const w = parsePlaybookWorkflow(source.playbook_workflow);
  const base = w ?? {};
  const materials = base.materials_checklist?.length
    ? mergeMaterialsWithDefaults(base.materials_checklist)
    : defaultMaterialsChecklist();
  return {
    ...defaultEmptyPlaybookWorkflow(),
    ...base,
    materials_checklist: materials,
  };
}

function mergeMaterialsWithDefaults(rows: PlaybookMaterialRow[]): PlaybookMaterialRow[] {
  const byItem = new Map(rows.map((r) => [r.item, r]));
  return PLAYBOOK_MATERIALS_ITEM_LABELS.map((item) => {
    const hit = byItem.get(item);
    return {
      item,
      description: hit?.description ?? null,
      notes: hit?.notes ?? null,
    };
  });
}

function sumLineItems(
  items: PlaybookFrameworkLineItem[] | null | undefined
): number {
  let s = 0;
  for (const row of items ?? []) {
    s += Number(row.cost) || 0;
  }
  return s;
}

/** Framework line-item costs (food, vendors, activities, engagement). */
export function sumPlaybookFrameworkCosts(workflow: unknown): number {
  const w = parsePlaybookWorkflow(workflow);
  if (!w) return 0;
  return (
    sumLineItems(w.food_items) +
    sumLineItems(w.entertainment_items) +
    sumLineItems(w.bike_activities_items) +
    sumLineItems(w.engagement_items)
  );
}
