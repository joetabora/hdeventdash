import { z } from "zod";
import {
  MARKETING_PLATFORM_OPTIONS,
  MARKETING_TONES,
  MARKETING_COPY_LENGTHS,
} from "@/lib/ai/marketing-prompt/constants";

/** Variables merged server-side from {@link Event}; optional client overrides must satisfy schema extras. */
export const eventMarketingBaseVarsSchema = z
  .object({
    eventName: z.string().min(1).max(500),
    eventDateFormatted: z.string().min(1).max(200),
    eventDateShort: z.string().min(1).max(80),
    eventLocation: z.string().min(1).max(500),
    eventDescription: z.string().max(20_000),
    eventOwner: z.string().max(300),
  })
  .strict();

export type EventMarketingBaseVars = z.infer<typeof eventMarketingBaseVarsSchema>;

export const socialPostRegenVarsSchema = eventMarketingBaseVarsSchema.extend({
  platform: z.string().min(1).max(120),
  angle: z.string().min(1).max(240),
  existingContent: z.string().max(20_000),
});

export type SocialPostRegenVars = z.infer<typeof socialPostRegenVarsSchema>;

export const emailRegenVarsSchema = eventMarketingBaseVarsSchema.extend({
  campaignTitle: z.string().min(1).max(240),
  existingSubject: z.string().max(500),
  existingBody: z.string().max(50_000),
});

export type EmailRegenVars = z.infer<typeof emailRegenVarsSchema>;

export const descriptionRegenVarsSchema = eventMarketingBaseVarsSchema.extend({
  label: z.string().min(1).max(240),
  existingContent: z.string().max(50_000),
});

export type DescriptionRegenVars = z.infer<typeof descriptionRegenVarsSchema>;

export const hashtagsVarsSchema = eventMarketingBaseVarsSchema.extend({
  maxTags: z.coerce.number().int().min(5).max(40).optional().default(16),
});

export const facebookDescriptionVarsSchema = eventMarketingBaseVarsSchema.extend({
  tone: z.enum(["professional", "casual", "hype"]).optional().default("professional"),
});

const platformValues = MARKETING_PLATFORM_OPTIONS.map((p) => p.value) as [
  (typeof MARKETING_PLATFORM_OPTIONS)[number]["value"],
  ...(typeof MARKETING_PLATFORM_OPTIONS)[number]["value"][],
];

const toneValues = MARKETING_TONES.map((t) => t.value) as [
  (typeof MARKETING_TONES)[number]["value"],
  ...(typeof MARKETING_TONES)[number]["value"][],
];

const copyLengthValues = MARKETING_COPY_LENGTHS.map((l) => l.value) as [
  (typeof MARKETING_COPY_LENGTHS)[number]["value"],
  ...(typeof MARKETING_COPY_LENGTHS)[number]["value"][],
];

/** Built client-side from playbook copy-development fields + fixed Prompt 2/3 text. */
export const playbookCopyDevelopmentPackVarsSchema = z
  .object({
    briefing: z.string().min(40).max(45_000),
  })
  .strict();

const marketingToggleOptionsSchema = z
  .object({
    moreEmojis: z.boolean().optional(),
    moreSeoFocus: z.boolean().optional(),
    moreEngagement: z.boolean().optional(),
    shorterCopy: z.boolean().optional(),
    longerCopy: z.boolean().optional(),
    strongerCta: z.boolean().optional(),
    moreProfessional: z.boolean().optional(),
    moreHype: z.boolean().optional(),
  })
  .strict()
  .optional()
  .default({});

/** Marketing assistant: platform/tone/toggles + playbook briefing. */
export const playbookMarketingAssistantVarsSchema = z
  .object({
    briefing: z.string().min(40).max(45_000),
    platform: z.enum(platformValues).default("facebook_post"),
    tone: z.enum(toneValues).default("hype"),
    copyLength: z.enum(copyLengthValues).default("standard"),
    variationCount: z.coerce.number().int().min(1).max(3).default(1),
    options: marketingToggleOptionsSchema,
  })
  .strict();
