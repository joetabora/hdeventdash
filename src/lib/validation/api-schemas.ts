import { z } from "zod";
import type { UserRole } from "@/types/database";

/** Aligns with numeric(12, 2) — max value before overflow. */
export const BUDGET_AMOUNT_MAX = 999_999_999_999.99;

const VENDOR_NAME_MAX = 500;
const VENDOR_CONTACT_MAX = 200;
const VENDOR_EMAIL_MAX = 320;
const VENDOR_PHONE_MAX = 50;
const VENDOR_WEBSITE_MAX = 2000;
const VENDOR_CATEGORY_MAX = 200;
const VENDOR_NOTES_MAX = 10_000;

const BUDGET_LOCATION_MAX = 500;

const EVENT_VENDOR_ROLE_MAX = 500;
const EVENT_VENDOR_NOTES_MAX = 10_000;

export function isHttpsUrl(s: string): boolean {
  try {
    return new URL(s).protocol === "https:";
  } catch {
    return false;
  }
}

const trimmed = (max: number) => z.string().max(max).trim();

const optionalEmptyEmail = trimmed(VENDOR_EMAIL_MAX).default("").refine(
  (s) => s === "" || z.email().safeParse(s).success,
  "Invalid email address"
);

const optionalHttpsWebsite = trimmed(VENDOR_WEBSITE_MAX).default("").refine(
  (s) => s === "" || isHttpsUrl(s),
  "Website must be empty or a valid https:// URL"
);

/** First day of calendar month for copy-previous API */
export const budgetCopyPreviousSchema = z
  .object({
    targetMonth: trimmed(10)
      .regex(/^\d{4}-\d{2}-\d{2}$/, "targetMonth must be YYYY-MM-DD")
      .refine(
        (s) => s.endsWith("-01"),
        "targetMonth must be the first day of a month (YYYY-MM-01)"
      ),
  })
  .strict();

export const budgetUpsertSchema = z
  .object({
    month: trimmed(10)
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Month must be YYYY-MM-DD")
      .refine(
        (s) => s.endsWith("-01"),
        "Month must be the first day of the month (YYYY-MM-01)"
      ),
    location: trimmed(BUDGET_LOCATION_MAX).min(1, "Location is required"),
    budget_amount: z.union([
      z.number().finite().min(0).max(BUDGET_AMOUNT_MAX),
      trimmed(32).transform((s) => Number(s)),
    ]).pipe(
      z
        .number({ error: "budget_amount must be a number" })
        .finite()
        .min(0, "budget_amount must be non-negative")
        .max(BUDGET_AMOUNT_MAX, "budget_amount is too large")
    ),
  })
  .strict();

export const vendorCreateSchema = z
  .object({
    name: trimmed(VENDOR_NAME_MAX).min(1, "Name is required"),
    contact_name: trimmed(VENDOR_CONTACT_MAX).default(""),
    email: optionalEmptyEmail,
    phone: trimmed(VENDOR_PHONE_MAX).default(""),
    website: optionalHttpsWebsite,
    category: trimmed(VENDOR_CATEGORY_MAX).default(""),
    notes: trimmed(VENDOR_NOTES_MAX).default(""),
  })
  .strict();

const optionalHttpsWebsiteField = trimmed(VENDOR_WEBSITE_MAX).refine(
  (s) => s === "" || isHttpsUrl(s),
  "Website must be empty or a valid https:// URL"
);

const optionalEmailField = trimmed(VENDOR_EMAIL_MAX).refine(
  (s) => s === "" || z.email().safeParse(s).success,
  "Invalid email address"
);

export const vendorPatchSchema = z
  .object({
    name: trimmed(VENDOR_NAME_MAX).min(1).optional(),
    contact_name: trimmed(VENDOR_CONTACT_MAX).optional(),
    email: optionalEmailField.optional(),
    phone: trimmed(VENDOR_PHONE_MAX).optional(),
    website: optionalHttpsWebsiteField.optional(),
    category: trimmed(VENDOR_CATEGORY_MAX).optional(),
    notes: trimmed(VENDOR_NOTES_MAX).optional(),
  })
  .strict()
  .refine(
    (o) => Object.keys(o).length > 0,
    "No valid fields to update."
  );

export const vendorParticipationStatusSchema = z.enum([
  "invited",
  "confirmed",
  "declined",
  "participated",
  "cancelled",
]);

export const attachEventVendorSchema = z
  .object({
    vendor_id: z.uuid(),
    role: trimmed(EVENT_VENDOR_ROLE_MAX).default(""),
    notes: trimmed(EVENT_VENDOR_NOTES_MAX).default(""),
    participation_status: vendorParticipationStatusSchema.optional(),
  })
  .strict();

export const eventVendorPatchSchema = z
  .object({
    role: trimmed(EVENT_VENDOR_ROLE_MAX).optional(),
    notes: trimmed(EVENT_VENDOR_NOTES_MAX).optional(),
    participation_status: vendorParticipationStatusSchema.optional(),
  })
  .strict()
  .refine(
    (o) =>
      o.role !== undefined ||
      o.notes !== undefined ||
      o.participation_status !== undefined,
    "No valid fields to update."
  );

const USER_ROLES = ["staff", "manager", "admin"] as const satisfies readonly UserRole[];

export const adminCreateUserSchema = z
  .object({
    email: trimmed(320).min(1, "Email is required").pipe(z.email()),
    password: z.string().min(6, "Password must be at least 6 characters").max(128),
    role: z.enum(USER_ROLES),
  })
  .strict();

export const adminRolePatchSchema = z
  .object({
    role: z.enum(USER_ROLES),
  })
  .strict();
