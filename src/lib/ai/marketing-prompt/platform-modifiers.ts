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

  facebook_post: `Platform: Facebook Event details / dealership page post (NOT Instagram — no hashtag line).

Required structure — follow ALL steps in order:

1) HEADLINE (one line): Scroll-stopping energy; include any REQUIRED phrase from the briefing (e.g. branded tagline). OK: 1–2 tasteful emojis on this line.

2) BODY — write EXACTLY 2–3 separate short paragraphs (blank line between each):
   • Paragraph A: Sensory opener — weather, grill smoke, food smells, chrome in the sun, bikes in the lot — use ONLY briefing facts.
   • Paragraph B: Community welcome — who should come, inclusive vibe, plus-ones if stated in briefing.
   • Paragraph C (optional if thin briefing): One concrete highlight (who is cooking, what's on the menu, entertainment) from briefing only.

3) DETAIL BLOCK — each on its own line with a simple icon/emoji label (example pattern, fill from briefing only):
🏍️ <event name>
📍 <location / dealership>
📅 <date as given in briefing>
⏰ <time range — match briefing exactly; if it says noon or 12pm use that, never invent "12am" unless briefing says so>

4) CLOSER — biker-attitude sign-off + ONE clear CTA (RSVP, roll out, tag your crew 👇) consistent with briefing.

Hard rules:
- For STANDARD or LONG length: do NOT output a single short paragraph for the whole body.
- Do NOT add hashtags or a \"hashtags\" row (save those for Instagram).
- Sound human and local — like the dealership team posted it.`,

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
  if (platform === "facebook_post") {
    return "Output plain text only — no markdown fences, no JSON, no commentary before or after. Multiple paragraphs with blank lines are required. Do NOT add a hashtag line.";
  }
  return "Output plain text only — no markdown fences, no JSON, no commentary before or after the copy.";
}
