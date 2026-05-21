import type { MarketingPlatform } from "./types";

const PLATFORM_MODIFIERS: Record<MarketingPlatform, string> = {
  full_copy_pack: `Output format — use EXACTLY these section labels (each on its own line, content immediately below):

FACEBOOK_DETAILS:
<Engaging Facebook Event description — lead with energy, use line breaks, tasteful emojis OK>

SUMMARY:
<Short web listing paragraph>

SEO_META_TITLE:
<~50–60 characters; primary keyword + event name + local relevance>

SEO_META_DESCRIPTION:
<140–155 characters; benefit + date/location hint + soft CTA; no emoji>

SOCIAL_CAMPAIGN:
<Bullet list with "- " prefix — 4–6 post ideas for the week leading up to the event>`,

  facebook_post: `Platform: Facebook post / Facebook Event details.
- Open with a scroll-stopping hook (can use 1–2 emojis in the headline line).
- Use generous line breaks — one idea per line when listing highlights.
- Build excitement; sound like a human posting for the dealership page.
- End with a clear CTA (RSVP, show up, tag friends, scan QR — only if supported by briefing).
- Length: medium; scannable on mobile.
- Encourage comments/shares naturally ("Tag your riding crew 👇").`,

  instagram_caption: `Platform: Instagram caption.
- Strong first line hook (only text shown before "...more").
- Body: energetic, visual language; emojis OK but not every line.
- Include a line of 5–10 relevant hashtags at the end (mix local, riding, event).
- CTA: save, share, tag, or link in bio as appropriate.`,

  website_event_description: `Platform: Website event description.
- SEO-friendly but human-readable prose.
- H1-style opening line with event name; then scannable sections or short paragraphs.
- Include who it's for, what happens, when/where — from briefing only.
- Natural local keywords (city, dealership name, Harley, motorcycle event) without stuffing.
- Professional warmth; minimal emojis (0–2 max).`,

  seo_meta: `Platform: SEO meta pack.
Output EXACTLY:

SEO_META_TITLE:
<50–60 chars — primary intent keyword, event name, location>

SEO_META_DESCRIPTION:
<140–155 chars — compelling snippet for search results; include location; soft CTA>

SEO_KEYWORDS:
<comma-separated 8–12 semantic/local keywords — no hashtag symbols>

Rules: NO emojis in title or description. No clickbait. No unverified offers.`,

  google_business_post: `Platform: Google Business Profile post.
- Short, local, discovery-focused update.
- Lead with what's happening + when + where.
- One clear CTA button phrase at end (Learn more / RSVP / Visit us).
- 150–300 words max; plain text; 1–3 emojis optional.`,

  email_blast: `Platform: Email blast.
Output EXACTLY:

SUBJECT:
<compelling subject, under 60 chars when possible>

PREVIEW_TEXT:
<optional preheader, under 90 chars>

BODY:
<plain-text email with blank lines between paragraphs; warm sign-off>`,

  vendor_spotlight: `Platform: Vendor spotlight post.
- Highlight the vendor/partner and what they bring to the event (from briefing only).
- Tie back to the overall event experience.
- Grateful, community tone; social-ready formatting.`,

  event_reminder: `Platform: Event reminder.
- Urgency without desperation ("Tomorrow!", "This Friday", "Last call").
- Bullet the essentials: time, place, highlights.
- Short — optimized for quick scroll; emojis welcome sparingly.`,

  sponsor_highlight: `Platform: Sponsor highlight.
- Thank the sponsor; explain their connection to the event (briefing facts only).
- Warm, community gratitude; not overly salesy unless briefing says so.`,

  event_recap: `Platform: Event recap.
- Past tense; thank attendees and community.
- Highlight moments from briefing (attendance vibes, music, food — don't invent metrics).
- Tease what's next if briefing mentions future events.`,
};

export function buildPlatformModifier(platform: MarketingPlatform): string {
  return PLATFORM_MODIFIERS[platform];
}

export function buildPlatformOutputLabel(platform: MarketingPlatform): string {
  if (
    platform === "full_copy_pack" ||
    platform === "seo_meta" ||
    platform === "email_blast"
  ) {
    return "Use the labeled sections exactly as specified above.";
  }
  return "Output plain text only — no markdown fences, no JSON, no commentary before or after the copy.";
}
