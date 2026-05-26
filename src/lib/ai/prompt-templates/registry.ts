import type { z } from "zod";
import { AI_TEMPLATE_IDS } from "@/lib/ai/prompt-templates/ids";
import { interpolatePlaceholders } from "@/lib/ai/prompt-templates/render";
import {
  descriptionRegenVarsSchema,
  emailRegenVarsSchema,
  eventMarketingBaseVarsSchema,
  facebookDescriptionVarsSchema,
  hashtagsVarsSchema,
  playbookCopyDevelopmentPackVarsSchema,
  playbookMarketingAssistantVarsSchema,
  socialPostRegenVarsSchema,
} from "@/lib/ai/prompt-templates/schemas";
import {
  composeLegacyCopyPackPrompt,
  composeMarketingPrompt,
} from "@/lib/ai/marketing-prompt/compose";
import { DEFAULT_MARKETING_TOGGLES } from "@/lib/ai/marketing-prompt/types";

export type RenderedPrompt = {
  system: string;
  user: string;
  /** Template-suggested sampling temperature (Ollama). */
  temperature?: number;
  /** Template-suggested Ollama num_predict cap (shorter for marketing copy). */
  numPredict?: number;
};

export type PromptTemplateDefinition<TVars> = {
  id: string;
  version: string;
  varsSchema: z.ZodType<TVars>;
  render: (vars: TVars) => RenderedPrompt;
};

function stringifyVars(vars: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (v === null || v === undefined) out[k] = "";
    else if (typeof v === "string") out[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") out[k] = String(v);
    else out[k] = JSON.stringify(v);
  }
  return out;
}

function jsonOnlySystem(extra?: string): string {
  return [
    "Reply with ONLY valid JSON — no markdown fences, no commentary before or after.",
    extra ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

const SOCIAL_JSON_RULES = `Return a JSON array of exactly 8 objects. Each object must have:
- "platform": string — one of: Instagram, Facebook, X / Twitter, LinkedIn, TikTok / Reels caption (use twice for Instagram with different angles).
- "angle": short label for the creative angle (e.g. "Hype / save the date").
- "content": full post body text including line breaks where helpful.

Cover multiple platforms (Instagram twice, Facebook twice, Twitter twice, LinkedIn once, TikTok/Reels once).`;

const EMAIL_JSON_RULES = `Return a JSON array of exactly 4 objects. Each object must have:
- "title": campaign angle label (e.g. "Launch / announcement").
- "subject": email subject line.
- "body": plain-text email body with blank lines between paragraphs (no HTML).`;

const DESC_JSON_RULES = `Return a JSON array of exactly 4 objects. Each object must have:
- "label": one of "Short blurb (social / SMS)", "Standard (app / calendar)", "Long-form (website / press)", "SEO-style summary".
- "content": the description text for that variant.`;

const PLAYBOOK_COPY_PACK_SECTIONS = `Produce ALL requested deliverables in ONE plain-text response using EXACTLY these section labels (each label on its own line, immediately followed by the content):

FACEBOOK_DETAILS:
<body copy suitable for a Facebook Event description — warm, clear, dealership-appropriate>

SUMMARY:
<short paragraph summary suitable for a web event listing>

SEO_META_TITLE:
<suggested meta title; aim around 60 characters or less>

SEO_META_DESCRIPTION:
<meta description at or under 150 characters>

SOCIAL_CAMPAIGN:
<a compact bullet list using "- " at the start of each line outlining a simple multi-post social campaign>

Rules:
- Plain text only — no markdown code fences.
- Treat everything under "Briefing" below as factual constraints; do not invent sponsors, discounts, legal promises, or perks not stated there.
- Honor tone and phrases called out in the briefing when provided.`;

export const PROMPT_TEMPLATE_REGISTRY: Record<
  string,
  PromptTemplateDefinition<unknown>
> = {
  [AI_TEMPLATE_IDS.MARKETING_SOCIAL_POSTS]: {
    id: AI_TEMPLATE_IDS.MARKETING_SOCIAL_POSTS,
    version: "1",
    varsSchema: eventMarketingBaseVarsSchema,
    render: (vars) => {
      const s = stringifyVars(vars as Record<string, unknown>);
      return {
        system: jsonOnlySystem(SOCIAL_JSON_RULES),
        user: interpolatePlaceholders(
          [
            "Generate social posts for this dealership event:",
            "",
            "Event name: {{eventName}}",
            "When: {{eventDateFormatted}} (short: {{eventDateShort}})",
            "Where: {{eventLocation}}",
            "Owner/contact line (optional): {{eventOwner}}",
            "",
            "Event description / notes:",
            "{{eventDescription}}",
          ].join("\n"),
          s
        ),
      };
    },
  },

  [AI_TEMPLATE_IDS.MARKETING_EMAIL_CAMPAIGNS]: {
    id: AI_TEMPLATE_IDS.MARKETING_EMAIL_CAMPAIGNS,
    version: "1",
    varsSchema: eventMarketingBaseVarsSchema,
    render: (vars) => {
      const s = stringifyVars(vars as Record<string, unknown>);
      return {
        system: jsonOnlySystem(EMAIL_JSON_RULES),
        user: interpolatePlaceholders(
          [
            "Generate email campaign drafts for this dealership event:",
            "",
            "Event name: {{eventName}}",
            "When: {{eventDateFormatted}}",
            "Where: {{eventLocation}}",
            "Signed line may reference: {{eventOwner}}",
            "",
            "Event description:",
            "{{eventDescription}}",
          ].join("\n"),
          s
        ),
      };
    },
  },

  [AI_TEMPLATE_IDS.MARKETING_EVENT_DESCRIPTIONS]: {
    id: AI_TEMPLATE_IDS.MARKETING_EVENT_DESCRIPTIONS,
    version: "1",
    varsSchema: eventMarketingBaseVarsSchema,
    render: (vars) => {
      const s = stringifyVars(vars as Record<string, unknown>);
      return {
        system: jsonOnlySystem(DESC_JSON_RULES),
        user: interpolatePlaceholders(
          [
            "Generate multiple description variants for calendar listings and web:",
            "",
            "Event name: {{eventName}}",
            "When: {{eventDateFormatted}}",
            "Where: {{eventLocation}}",
            "",
            "Source notes:",
            "{{eventDescription}}",
          ].join("\n"),
          s
        ),
      };
    },
  },

  [AI_TEMPLATE_IDS.MARKETING_SOCIAL_POST_REGEN]: {
    id: AI_TEMPLATE_IDS.MARKETING_SOCIAL_POST_REGEN,
    version: "1",
    varsSchema: socialPostRegenVarsSchema,
    render: (vars) => {
      const s = stringifyVars(vars as Record<string, unknown>);
      return {
        system: jsonOnlySystem(
          `Return a single JSON object with keys "platform", "angle", "content" matching the requested slot.
Keep the same platform and angle unless you improve wording slightly; refresh the body copy.`
        ),
        user: interpolatePlaceholders(
          [
            "Rewrite this social post for the same dealership event:",
            "",
            "Platform: {{platform}}",
            "Angle: {{angle}}",
            "",
            "Current draft:",
            "{{existingContent}}",
            "",
            "Event context:",
            "{{eventName}} on {{eventDateFormatted}} at {{eventLocation}}.",
            "Notes: {{eventDescription}}",
          ].join("\n"),
          s
        ),
      };
    },
  },

  [AI_TEMPLATE_IDS.MARKETING_EMAIL_REGEN]: {
    id: AI_TEMPLATE_IDS.MARKETING_EMAIL_REGEN,
    version: "1",
    varsSchema: emailRegenVarsSchema,
    render: (vars) => {
      const s = stringifyVars(vars as Record<string, unknown>);
      return {
        system: jsonOnlySystem(
          `Return a single JSON object with keys "title", "subject", "body".
Keep "title" identical to the campaign angle title when possible.`
        ),
        user: interpolatePlaceholders(
          [
            "Refresh this email draft:",
            "",
            "Campaign angle title: {{campaignTitle}}",
            "",
            "Subject: {{existingSubject}}",
            "",
            "Body:",
            "{{existingBody}}",
            "",
            "Event: {{eventName}} · {{eventDateFormatted}} · {{eventLocation}}",
            "Notes: {{eventDescription}}",
          ].join("\n"),
          s
        ),
      };
    },
  },

  [AI_TEMPLATE_IDS.MARKETING_DESCRIPTION_REGEN]: {
    id: AI_TEMPLATE_IDS.MARKETING_DESCRIPTION_REGEN,
    version: "1",
    varsSchema: descriptionRegenVarsSchema,
    render: (vars) => {
      const s = stringifyVars(vars as Record<string, unknown>);
      return {
        system: jsonOnlySystem(
          `Return a single JSON object with keys "label", "content". Keep "label" identical to the requested label.`
        ),
        user: interpolatePlaceholders(
          [
            "Rewrite this event description variant:",
            "",
            "Label: {{label}}",
            "",
            "Current:",
            "{{existingContent}}",
            "",
            "Event: {{eventName}} · {{eventDateFormatted}} · {{eventLocation}}",
            "Notes: {{eventDescription}}",
          ].join("\n"),
          s
        ),
      };
    },
  },

  [AI_TEMPLATE_IDS.SOCIAL_HASHTAGS]: {
    id: AI_TEMPLATE_IDS.SOCIAL_HASHTAGS,
    version: "1",
    varsSchema: hashtagsVarsSchema,
    render: (vars) => {
      const s = stringifyVars(vars as Record<string, unknown>);
      return {
        system: jsonOnlySystem(
          `Return a JSON object with one key "hashtags" whose value is an array of strings.
Each string starts with #. Produce exactly {{maxTags}} distinct hashtags relevant to the event (mix branded, local, riding culture). No markdown.`
        ),
        user: interpolatePlaceholders(
          [
            "Suggest hashtags for:",
            "{{eventName}}",
            "{{eventDateFormatted}} · {{eventLocation}}",
            "",
            "{{eventDescription}}",
          ].join("\n"),
          s
        ),
      };
    },
  },

  [AI_TEMPLATE_IDS.SOCIAL_FACEBOOK_DESCRIPTION]: {
    id: AI_TEMPLATE_IDS.SOCIAL_FACEBOOK_DESCRIPTION,
    version: "1",
    varsSchema: facebookDescriptionVarsSchema,
    render: (vars) => {
      const s = stringifyVars(vars as Record<string, unknown>);
      return {
        system: jsonOnlySystem(
          `Return a JSON object with keys "title" (short headline) and "description" (Facebook event-style body, plain text, paragraphs separated by blank lines).
Tone preset: {{tone}}.`
        ),
        user: interpolatePlaceholders(
          [
            "Write Facebook event-style title and description for:",
            "{{eventName}}",
            "When: {{eventDateFormatted}}",
            "Where: {{eventLocation}}",
            "",
            "Details:",
            "{{eventDescription}}",
          ].join("\n"),
          s
        ),
      };
    },
  },

  [AI_TEMPLATE_IDS.PLAYBOOK_COPY_DEVELOPMENT_PACK]: {
    id: AI_TEMPLATE_IDS.PLAYBOOK_COPY_DEVELOPMENT_PACK,
    version: "2",
    varsSchema: playbookCopyDevelopmentPackVarsSchema,
    render: (vars) => {
      const v = vars as { briefing: string };
      return composeLegacyCopyPackPrompt(v.briefing);
    },
  },

  [AI_TEMPLATE_IDS.PLAYBOOK_MARKETING_ASSISTANT]: {
    id: AI_TEMPLATE_IDS.PLAYBOOK_MARKETING_ASSISTANT,
    version: "1",
    varsSchema: playbookMarketingAssistantVarsSchema,
    render: (vars) => {
      const v = vars as {
        briefing: string;
        platform: Parameters<typeof composeMarketingPrompt>[0]["platform"];
        tone: Parameters<typeof composeMarketingPrompt>[0]["tone"];
        copyLength: Parameters<typeof composeMarketingPrompt>[0]["copyLength"];
        variationCount: 1 | 2 | 3;
        options?: Partial<typeof DEFAULT_MARKETING_TOGGLES>;
      };
      return composeMarketingPrompt({
        briefing: v.briefing,
        platform: v.platform,
        tone: v.tone,
        copyLength: v.copyLength,
        variationCount: v.variationCount,
        options: { ...DEFAULT_MARKETING_TOGGLES, ...v.options },
      });
    },
  },
};

export function getPromptTemplate(
  templateId: string
): PromptTemplateDefinition<unknown> | undefined {
  return PROMPT_TEMPLATE_REGISTRY[templateId];
}
