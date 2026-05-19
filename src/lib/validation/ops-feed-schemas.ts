import { z } from "zod";
import {
  OPS_FEED_ENTRY_TYPES,
  OPS_FEED_PRIORITIES,
  OPS_FEED_ENTRY_STATUSES,
} from "@/types/database";

const trimmed = (max: number) => z.string().max(max).trim();

const OPS_FEED_TITLE_MAX = 500;
const OPS_FEED_CONTENT_MAX = 50_000;
const OPS_FEED_TAG_MAX = 80;
const OPS_FEED_MAX_TAGS = 20;

const entryTypeValues = OPS_FEED_ENTRY_TYPES.map((t) => t.value) as [
  (typeof OPS_FEED_ENTRY_TYPES)[number]["value"],
  ...(typeof OPS_FEED_ENTRY_TYPES)[number]["value"][],
];

const priorityValues = OPS_FEED_PRIORITIES.map((p) => p.value) as [
  (typeof OPS_FEED_PRIORITIES)[number]["value"],
  ...(typeof OPS_FEED_PRIORITIES)[number]["value"][],
];

const statusValues = OPS_FEED_ENTRY_STATUSES.map((s) => s.value) as [
  (typeof OPS_FEED_ENTRY_STATUSES)[number]["value"],
  ...(typeof OPS_FEED_ENTRY_STATUSES)[number]["value"][],
];

const tagSchema = trimmed(OPS_FEED_TAG_MAX)
  .min(1)
  .transform((s) => s.toLowerCase());

export const opsFeedTagsSchema = z
  .array(tagSchema)
  .max(OPS_FEED_MAX_TAGS)
  .default([]);

export const opsFeedEntryCreateSchema = z
  .object({
    content: trimmed(OPS_FEED_CONTENT_MAX).min(1, "Content is required"),
    title: trimmed(OPS_FEED_TITLE_MAX).optional(),
    entry_type: z.enum(entryTypeValues).default("note"),
    priority: z.enum(priorityValues).default("normal"),
    tags: opsFeedTagsSchema.optional(),
    event_id: z.union([z.string().uuid(), z.null()]).optional(),
    status: z.enum(statusValues).default("active"),
  })
  .strict();

export const opsFeedEntryPatchSchema = z
  .object({
    title: trimmed(OPS_FEED_TITLE_MAX).optional(),
    content: trimmed(OPS_FEED_CONTENT_MAX).min(1).optional(),
    entry_type: z.enum(entryTypeValues).optional(),
    priority: z.enum(priorityValues).optional(),
    tags: opsFeedTagsSchema.optional(),
    event_id: z.union([z.string().uuid(), z.null()]).optional(),
    status: z.enum(statusValues).optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: "No fields to update" });

export const opsFeedListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(30),
  q: z.string().max(500).default(""),
  tag: z.string().max(OPS_FEED_TAG_MAX).default(""),
  priority: z.union([z.enum(priorityValues), z.literal("")]).default(""),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .default(""),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .default(""),
  status: z.union([z.enum(statusValues), z.literal("")]).default("active"),
});
