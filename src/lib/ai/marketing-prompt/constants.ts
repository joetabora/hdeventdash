import type { MarketingPlatform, MarketingTone, MarketingCopyLength } from "./types";

export const MARKETING_PLATFORM_OPTIONS: {
  value: MarketingPlatform;
  label: string;
  description: string;
}[] = [
  {
    value: "full_copy_pack",
    label: "Full copy pack",
    description: "Facebook details + summary + SEO meta + social campaign outline",
  },
  {
    value: "facebook_post",
    label: "Facebook post",
    description: "Engaging Facebook Event / feed post",
  },
  {
    value: "instagram_caption",
    label: "Instagram caption",
    description: "Caption with hooks and hashtags line",
  },
  {
    value: "website_event_description",
    label: "Website event description",
    description: "Scannable web listing copy",
  },
  {
    value: "seo_meta",
    label: "SEO meta",
    description: "Meta title + description optimized for search",
  },
  {
    value: "google_business_post",
    label: "Google Business Profile",
    description: "Local discovery post with CTA",
  },
  {
    value: "email_blast",
    label: "Email blast",
    description: "Subject line + email body",
  },
  {
    value: "vendor_spotlight",
    label: "Vendor spotlight",
    description: "Highlight a vendor or partner at the event",
  },
  {
    value: "event_reminder",
    label: "Event reminder",
    description: "Short urgency reminder post",
  },
  {
    value: "sponsor_highlight",
    label: "Sponsor highlight",
    description: "Thank / promote a sponsor",
  },
  {
    value: "event_recap",
    label: "Event recap",
    description: "Post-event thank-you and recap",
  },
];

export const MARKETING_TONES: { value: MarketingTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "hype", label: "Hype" },
  { value: "community", label: "Community" },
  { value: "luxury", label: "Luxury" },
  { value: "family_friendly", label: "Family friendly" },
  { value: "vintage_harley", label: "Vintage Harley" },
  { value: "high_energy", label: "High energy" },
  { value: "casual", label: "Casual" },
  { value: "aggressive_sales", label: "Aggressive sales" },
  { value: "funny", label: "Funny" },
];

export const MARKETING_COPY_LENGTHS: {
  value: MarketingCopyLength;
  label: string;
}[] = [
  { value: "short", label: "Short" },
  { value: "standard", label: "Standard" },
  { value: "long", label: "Long" },
];

export const SEO_PLATFORMS: MarketingPlatform[] = [
  "seo_meta",
  "website_event_description",
  "google_business_post",
  "full_copy_pack",
];

export const SOCIAL_PLATFORMS: MarketingPlatform[] = [
  "facebook_post",
  "instagram_caption",
  "event_reminder",
  "event_recap",
  "vendor_spotlight",
  "sponsor_highlight",
];
