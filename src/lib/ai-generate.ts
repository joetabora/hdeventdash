import type { Event } from "@/types/database";
import { apiFetchJson } from "@/lib/api/api-fetch-json";
import type { AiCompleteApiResponse } from "@/lib/ai/api-contract";
import { AI_TEMPLATE_IDS } from "@/lib/ai/prompt-templates/ids";
import { parseJsonFromModelText } from "@/lib/ai/parse-json-response";
import {
  rawDescriptionsPackSchema,
  rawDescriptionSingleSchema,
  rawEmailPackSchema,
  rawEmailSingleSchema,
  rawSocialPostsPackSchema,
  rawSocialPostSingleSchema,
} from "@/lib/ai/marketing-response-schemas";

export interface SocialPostDraft {
  id: string;
  platform: string;
  angle: string;
  content: string;
}

export interface EmailCampaignDraft {
  id: string;
  title: string;
  subject: string;
  body: string;
}

export interface EventDescriptionDraft {
  id: string;
  label: string;
  content: string;
}

export interface MarketingPlan {
  socialPosts: SocialPostDraft[];
  emailCampaigns: EmailCampaignDraft[];
  eventDescriptions: EventDescriptionDraft[];
}

function rid(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function completeForEvent(
  eventId: string,
  templateId: string,
  variables?: Record<string, unknown>
): Promise<AiCompleteApiResponse> {
  return apiFetchJson<AiCompleteApiResponse>(
    `/api/events/${encodeURIComponent(eventId)}/ai/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        variables: variables ?? {},
      }),
    }
  );
}

function parseSocialPack(text: string): Omit<SocialPostDraft, "id">[] {
  const raw = parseJsonFromModelText(text);
  const parsed = rawSocialPostsPackSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "The AI returned social posts in an unexpected format. Try regenerating."
    );
  }
  return parsed.data;
}

function parseEmailPack(text: string): Omit<EmailCampaignDraft, "id">[] {
  const raw = parseJsonFromModelText(text);
  const parsed = rawEmailPackSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "The AI returned emails in an unexpected format. Try regenerating."
    );
  }
  return parsed.data;
}

function parseDescriptionsPack(text: string): Omit<EventDescriptionDraft, "id">[] {
  const raw = parseJsonFromModelText(text);
  const parsed = rawDescriptionsPackSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "The AI returned descriptions in an unexpected format. Try regenerating."
    );
  }
  return parsed.data;
}

/** Regenerate one social slot using the current draft as context. */
export async function regenerateSocialPostAtIndex(
  event: Event,
  draft: Omit<SocialPostDraft, "id">
): Promise<Omit<SocialPostDraft, "id">> {
  const res = await completeForEvent(event.id, AI_TEMPLATE_IDS.MARKETING_SOCIAL_POST_REGEN, {
    platform: draft.platform,
    angle: draft.angle,
    existingContent: draft.content,
  });
  const raw = parseJsonFromModelText(res.text);
  const parsed = rawSocialPostSingleSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("The AI returned an unexpected social post object. Try again.");
  }
  return parsed.data;
}

/** Multiple social posts across platforms and angles (model-generated JSON). */
export async function generateSocialPosts(event: Event): Promise<SocialPostDraft[]> {
  const res = await completeForEvent(event.id, AI_TEMPLATE_IDS.MARKETING_SOCIAL_POSTS);
  return parseSocialPack(res.text).map((p) => ({ ...p, id: rid("social") }));
}

/** Regenerate one email idea using the current draft. */
export async function regenerateEmailCampaignAtIndex(
  event: Event,
  draft: Omit<EmailCampaignDraft, "id">
): Promise<Omit<EmailCampaignDraft, "id">> {
  const res = await completeForEvent(event.id, AI_TEMPLATE_IDS.MARKETING_EMAIL_REGEN, {
    campaignTitle: draft.title,
    existingSubject: draft.subject,
    existingBody: draft.body,
  });
  const raw = parseJsonFromModelText(res.text);
  const parsed = rawEmailSingleSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("The AI returned an unexpected email object. Try again.");
  }
  return parsed.data;
}

/** Several email campaign ideas (different angles). */
export async function generateEmailCampaigns(
  event: Event
): Promise<EmailCampaignDraft[]> {
  const res = await completeForEvent(event.id, AI_TEMPLATE_IDS.MARKETING_EMAIL_CAMPAIGNS);
  return parseEmailPack(res.text).map((c) => ({ ...c, id: rid("email") }));
}

/** Regenerate one description variant using the current draft. */
export async function regenerateEventDescriptionAtIndex(
  event: Event,
  draft: Omit<EventDescriptionDraft, "id">
): Promise<Omit<EventDescriptionDraft, "id">> {
  const res = await completeForEvent(event.id, AI_TEMPLATE_IDS.MARKETING_DESCRIPTION_REGEN, {
    label: draft.label,
    existingContent: draft.content,
  });
  const raw = parseJsonFromModelText(res.text);
  const parsed = rawDescriptionSingleSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("The AI returned an unexpected description object. Try again.");
  }
  return parsed.data;
}

/** Short, standard, and long description variants. */
export async function generateEventDescriptions(
  event: Event
): Promise<EventDescriptionDraft[]> {
  const res = await completeForEvent(event.id, AI_TEMPLATE_IDS.MARKETING_EVENT_DESCRIPTIONS);
  return parseDescriptionsPack(res.text).map((v) => ({ ...v, id: rid("desc") }));
}

/**
 * Full marketing pack: many social posts, multiple email ideas, several descriptions.
 * Resolved via `/api/events/:id/ai/complete` → local Ollama.
 */
export async function generateMarketingPlan(event: Event): Promise<MarketingPlan> {
  const [socialRes, emailRes, descRes] = await Promise.all([
    completeForEvent(event.id, AI_TEMPLATE_IDS.MARKETING_SOCIAL_POSTS),
    completeForEvent(event.id, AI_TEMPLATE_IDS.MARKETING_EMAIL_CAMPAIGNS),
    completeForEvent(event.id, AI_TEMPLATE_IDS.MARKETING_EVENT_DESCRIPTIONS),
  ]);

  const socialPosts = parseSocialPack(socialRes.text).map((p) => ({
    ...p,
    id: rid("social"),
  }));
  const emailCampaigns = parseEmailPack(emailRes.text).map((c) => ({
    ...c,
    id: rid("email"),
  }));
  const eventDescriptions = parseDescriptionsPack(descRes.text).map((v) => ({
    ...v,
    id: rid("desc"),
  }));

  return { socialPosts, emailCampaigns, eventDescriptions };
}
