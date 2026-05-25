/**
 * Human-readable catalog of prompt templates (IDs live in ids.ts; bodies in registry.ts).
 * Use these stable templateId values from the API — do not send raw prompts from the browser.
 */
import { AI_TEMPLATE_IDS, type AiTemplateId } from "@/lib/ai/prompt-templates/ids";

export type PromptTemplateCatalogEntry = {
  id: AiTemplateId;
  label: string;
  description: string;
  /** Typical use case category */
  category: "social" | "seo" | "email" | "playbook" | "ads";
  supportsTone: boolean;
};

export const PROMPT_TEMPLATE_CATALOG: PromptTemplateCatalogEntry[] = [
  {
    id: AI_TEMPLATE_IDS.MARKETING_SOCIAL_POSTS,
    label: "Social media campaign",
    description: "Multi-platform post pack (Instagram, Facebook, X, LinkedIn, TikTok).",
    category: "social",
    supportsTone: false,
  },
  {
    id: AI_TEMPLATE_IDS.SOCIAL_FACEBOOK_DESCRIPTION,
    label: "Facebook event post",
    description: "Facebook Event description body copy.",
    category: "social",
    supportsTone: false,
  },
  {
    id: AI_TEMPLATE_IDS.MARKETING_EVENT_DESCRIPTIONS,
    label: "Event descriptions",
    description: "Short, standard, long-form, and SEO-style event summaries.",
    category: "seo",
    supportsTone: false,
  },
  {
    id: AI_TEMPLATE_IDS.PLAYBOOK_COPY_DEVELOPMENT_PACK,
    label: "Copy development pack",
    description:
      "Facebook details, web summary, SEO meta title/description, and social campaign outline.",
    category: "playbook",
    supportsTone: true,
  },
  {
    id: AI_TEMPLATE_IDS.PLAYBOOK_MARKETING_ASSISTANT,
    label: "Marketing assistant",
    description: "Platform-aware ad/social copy with tone, length, and enhancement toggles.",
    category: "ads",
    supportsTone: true,
  },
  {
    id: AI_TEMPLATE_IDS.MARKETING_EMAIL_CAMPAIGNS,
    label: "Email campaigns",
    description: "Four dealership email angles with subject lines and bodies.",
    category: "email",
    supportsTone: false,
  },
  {
    id: AI_TEMPLATE_IDS.SOCIAL_HASHTAGS,
    label: "Hashtag suggestions",
    description: "Event hashtag list for social posts.",
    category: "social",
    supportsTone: false,
  },
];

export function getPromptTemplateCatalogEntry(
  id: string
): PromptTemplateCatalogEntry | undefined {
  return PROMPT_TEMPLATE_CATALOG.find((e) => e.id === id);
}
