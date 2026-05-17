/** Stable identifiers for prompt templates (API `templateId`). */
export const AI_TEMPLATE_IDS = {
  MARKETING_SOCIAL_POSTS: "event.marketing.social_posts",
  MARKETING_EMAIL_CAMPAIGNS: "event.marketing.email_campaigns",
  MARKETING_EVENT_DESCRIPTIONS: "event.marketing.event_descriptions",
  MARKETING_SOCIAL_POST_REGEN: "event.marketing.social_post_regen",
  MARKETING_EMAIL_REGEN: "event.marketing.email_regen",
  MARKETING_DESCRIPTION_REGEN: "event.marketing.description_regen",
  SOCIAL_HASHTAGS: "event.social.hashtags",
  SOCIAL_FACEBOOK_DESCRIPTION: "event.social.facebook_description",
} as const;

export type AiTemplateId = (typeof AI_TEMPLATE_IDS)[keyof typeof AI_TEMPLATE_IDS];
