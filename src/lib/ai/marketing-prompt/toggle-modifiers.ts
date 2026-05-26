import type {
  MarketingCopyLength,
  MarketingPlatform,
  MarketingToggleOptions,
} from "./types";

export function buildToggleModifiers(options: MarketingToggleOptions): string {
  const lines: string[] = [];

  if (options.moreEmojis) {
    lines.push(
      "Emojis: use tastefully — 3–6 total, strategic placement (headline, bullets, CTA). Examples: 🔥 🎉 📍 🏍️ 🍔 🎶 👇. Never every sentence."
    );
  } else {
    lines.push(
      "Emojis: optional — 0–3 max, only where they add energy (headline or bullet labels). Never spam."
    );
  }

  if (options.moreEngagement) {
    lines.push(
      "Engagement: optimize hooks, ask a light question or invite tags/shares, create FOMO without fake scarcity."
    );
  }

  if (options.strongerCta) {
    lines.push(
      "CTA: end with one strong, specific call-to-action (RSVP, roll out, tag your crew, see you there)."
    );
  }

  if (options.moreProfessional) {
    lines.push("Dial back slang; keep warmth but polish vocabulary.");
  }

  if (options.moreHype) {
    lines.push("Extra hype: increase urgency and emotional peaks; bolder hooks.");
  }

  return lines.join("\n");
}

export function buildLengthModifier(
  copyLength: MarketingCopyLength,
  options: MarketingToggleOptions,
  platform?: MarketingPlatform
): string {
  const fb = platform === "facebook_post";
  if (options.shorterCopy || copyLength === "short") {
    return fb
      ? "Length: SHORT — punchy and scannable; aim ~80–120 words unless the briefing is very thin."
      : "Length: SHORT — punchy, minimal fluff, under ~120 words unless format requires more.";
  }
  if (options.longerCopy || copyLength === "long") {
    return fb
      ? "Length: LONG — rich Facebook Event vibe; aim ~180–260 words with blank lines between blocks — still easy to skim on phones."
      : "Length: LONG — richer detail from briefing, still scannable with line breaks.";
  }
  return fb
    ? "Length: STANDARD — for Facebook Event details aim ~120–200 words; use generous line breaks and multiple paragraphs (not a single block)."
    : "Length: STANDARD — balanced; enough detail to excite, not a wall of text.";
}

export function buildEmojiPolicy(options: MarketingToggleOptions): string {
  if (options.moreEmojis) {
    return "Emoji mode: ON — natural, strategic, dealership-appropriate.";
  }
  return "Emoji mode: light — use only when they genuinely boost energy.";
}
