/** Platform modes for structured marketing copy generation. */
export type MarketingPlatform =
  | "full_copy_pack"
  | "facebook_post"
  | "instagram_caption"
  | "website_event_description"
  | "seo_meta"
  | "google_business_post"
  | "email_blast"
  | "vendor_spotlight"
  | "event_reminder"
  | "sponsor_highlight"
  | "event_recap";

export type MarketingTone =
  | "professional"
  | "hype"
  | "community"
  | "luxury"
  | "family_friendly"
  | "vintage_harley"
  | "high_energy"
  | "casual"
  | "aggressive_sales"
  | "funny";

export type MarketingCopyLength = "short" | "standard" | "long";

export type MarketingToggleOptions = {
  moreEmojis: boolean;
  moreSeoFocus: boolean;
  moreEngagement: boolean;
  shorterCopy: boolean;
  longerCopy: boolean;
  strongerCta: boolean;
  moreProfessional: boolean;
  moreHype: boolean;
};

export const DEFAULT_MARKETING_TOGGLES: MarketingToggleOptions = {
  moreEmojis: false,
  moreSeoFocus: false,
  moreEngagement: true,
  shorterCopy: false,
  longerCopy: false,
  strongerCta: false,
  moreProfessional: false,
  moreHype: false,
};

export type MarketingPromptInput = {
  briefing: string;
  platform: MarketingPlatform;
  tone: MarketingTone;
  copyLength: MarketingCopyLength;
  variationCount: 1 | 2 | 3;
  options: MarketingToggleOptions;
};

export type ComposedMarketingPrompt = {
  system: string;
  user: string;
  temperature: number;
};
