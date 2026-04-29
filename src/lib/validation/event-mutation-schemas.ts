import { z } from "zod";
import {
  EVENT_STATUSES,
  EVENT_TYPES,
  CHECKLIST_SECTIONS,
  DOCUMENT_TAGS,
  MEDIA_TAGS,
  type EventStatus,
  type EventType,
  type ChecklistSection,
  type DocumentTag,
  type MediaTag,
} from "@/types/database";
import { BUDGET_AMOUNT_MAX } from "@/lib/validation/api-schemas";
import { playbookMarketingSchema } from "@/lib/playbook-marketing";

const EVENT_STATUS_VALUES = EVENT_STATUSES.map((s) => s.value) as [
  EventStatus,
  ...EventStatus[],
];

const EVENT_TYPE_VALUES = EVENT_TYPES.map((t) => t.value) as [
  EventType,
  ...EventType[],
];

const CHECKLIST_SECTION_VALUES = [...CHECKLIST_SECTIONS] as [
  ChecklistSection,
  ...ChecklistSection[],
];

const DOCUMENT_TAG_VALUES = DOCUMENT_TAGS.map((t) => t.value) as [
  DocumentTag,
  ...DocumentTag[],
];

const MEDIA_TAG_VALUES = MEDIA_TAGS.map((t) => t.value) as [
  MediaTag,
  ...MediaTag[],
];

export const eventStatusSchema = z.enum(EVENT_STATUS_VALUES);
export const eventTypeSchema = z.enum(EVENT_TYPE_VALUES);
export const checklistSectionSchema = z.enum(CHECKLIST_SECTION_VALUES);
export const documentTagSchema = z.enum(DOCUMENT_TAG_VALUES);
export const mediaTagSchema = z.enum(MEDIA_TAG_VALUES);

const moneyNonneg = z.number().finite().min(0).max(BUDGET_AMOUNT_MAX);

export const eventCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(500),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    location: z.string().max(500).default(""),
    owner: z.string().max(500).default(""),
    status: eventStatusSchema,
    description: z.string().max(20000).default(""),
    onedrive_link: z.string().max(2000).optional(),
    event_type: z.union([eventTypeSchema, z.null()]).optional(),
    planned_budget: z.union([moneyNonneg, z.null()]).optional(),
    actual_budget: z.union([moneyNonneg, z.null()]).optional(),
    event_goals: z.union([z.string().max(20000), z.null()]).optional(),
    core_activities: z.union([z.string().max(20000), z.null()]).optional(),
    giveaway_description: z.union([z.string().max(5000), z.null()]).optional(),
    giveaway_link: z.union([z.string().max(2000), z.null()]).optional(),
    rsvp_incentive: z.union([z.string().max(5000), z.null()]).optional(),
    rsvp_link: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .strict();

export const eventStaffPatchSchema = z
  .object({
    is_live_mode: z.boolean(),
  })
  .strict();

export const eventManagerPatchSchema = z
  .object({
    name: z.string().min(1).max(500).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    location: z.string().max(500).optional(),
    owner: z.string().max(500).optional(),
    status: eventStatusSchema.optional(),
    description: z.string().max(20000).optional(),
    onedrive_link: z.union([z.string().max(2000), z.null()]).optional(),
    is_live_mode: z.boolean().optional(),
    is_archived: z.boolean().optional(),
    attendance: z.union([z.number().int().min(0).max(10_000_000), z.null()]).optional(),
    recap_notes: z.union([z.string().max(20000), z.null()]).optional(),
    sales_estimate: z.union([moneyNonneg, z.null()]).optional(),
    roi_leads_generated: z
      .union([z.number().int().min(0).max(1_000_000_000), z.null()])
      .optional(),
    roi_bikes_sold: z.union([z.number().int().min(0).max(1_000_000), z.null()]).optional(),
    roi_service_revenue: z.union([moneyNonneg, z.null()]).optional(),
    roi_motorclothes_revenue: z.union([moneyNonneg, z.null()]).optional(),
    roi_bike_sales_revenue: z.union([moneyNonneg, z.null()]).optional(),
    roi_event_cost: z.union([moneyNonneg, z.null()]).optional(),
    event_type: z.union([eventTypeSchema, z.null()]).optional(),
    planned_budget: z.union([moneyNonneg, z.null()]).optional(),
    actual_budget: z.union([moneyNonneg, z.null()]).optional(),
    event_goals: z.union([z.string().max(20000), z.null()]).optional(),
    core_activities: z.union([z.string().max(20000), z.null()]).optional(),
    giveaway_description: z.union([z.string().max(5000), z.null()]).optional(),
    giveaway_link: z.union([z.string().max(2000), z.null()]).optional(),
    rsvp_incentive: z.union([z.string().max(5000), z.null()]).optional(),
    rsvp_link: z.union([z.string().max(2000), z.null()]).optional(),
    has_swap_meet: z.boolean().optional(),
    playbook_marketing: playbookMarketingSchema.optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: "No fields to update" });

export const checklistItemCreateSchema = z
  .object({
    section: checklistSectionSchema,
    label: z.string().trim().min(1).max(2000),
    sort_order: z.number().int().min(0).max(1_000_000),
    estimated_cost: z.union([moneyNonneg, z.null()]).optional(),
  })
  .strict();

const nullableAssignee = z.union([
  z.string().max(500),
  z.null(),
]);

const nullableComment = z.union([z.string().max(5000), z.null()]);

export const checklistStaffPatchSchema = z
  .object({
    is_checked: z.boolean().optional(),
    assignee: nullableAssignee.optional(),
    comment: nullableComment.optional(),
  })
  .strict()
  .refine(
    (o) =>
      o.is_checked !== undefined ||
      o.assignee !== undefined ||
      o.comment !== undefined,
    { message: "No fields to update" }
  );

export const checklistManagerPatchSchema = z
  .object({
    is_checked: z.boolean().optional(),
    assignee: nullableAssignee.optional(),
    comment: nullableComment.optional(),
    section: checklistSectionSchema.optional(),
    label: z.string().trim().min(1).max(2000).optional(),
    sort_order: z.number().int().min(0).max(1_000_000).optional(),
    estimated_cost: z.union([moneyNonneg, z.null()]).optional(),
  })
  .strict()
  .refine(
    (o) => Object.keys(o).length > 0,
    { message: "No fields to update" }
  );

export const commentCreateSchema = z
  .object({
    content: z.string().trim().min(1).max(10_000),
  })
  .strict();

const swapMeetSpotSizeSchema = z.enum(["10x10", "10x20"]);

export const swapMeetSpotCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(500),
    phone: z.string().max(50).default(""),
    email: z.string().max(320).default(""),
    spot_size: swapMeetSpotSizeSchema,
  })
  .strict();

export const swapMeetSpotPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(500).optional(),
    phone: z.string().max(50).optional(),
    email: z.string().max(320).optional(),
    spot_size: swapMeetSpotSizeSchema.optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: "No fields to update" });
