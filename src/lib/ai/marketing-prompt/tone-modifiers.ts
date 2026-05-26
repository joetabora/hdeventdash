import type { MarketingTone } from "./types";

const TONE_MODIFIERS: Record<MarketingTone, string> = {
  professional:
    "Tone: Professional — polished and trustworthy, still conversational. Minimal slang. Clear facts and respectful invitation.",
  hype:
    "Tone: Hype — high energy, urgency, exclamation-worthy moments. Strong hooks. Amp up excitement; use power words (returns, packed, legendary, don't sleep on this).",
  community:
    "Tone: Community — inclusive, welcoming, \"our people\", riders and families. Emphasize belonging and shared passion.",
  luxury:
    "Tone: Luxury — refined, premium, exclusive feel. Understated confidence; quality over volume.",
  family_friendly:
    "Tone: Family friendly — warm, accessible, all ages welcome. Safe, fun, approachable language.",
  vintage_harley:
    "Tone: Vintage Harley — heritage, classic Americana, timeless riding culture. Nods to tradition and the open road.",
  high_energy:
    "Tone: High energy — bold, festival-forward momentum. Mix punchy one-liners with fuller sentences; keep rhythm varied (avoid only choppy fragments).",
  casual:
    "Tone: Casual — like texting a riding buddy who works at the dealership. Relaxed, friendly, zero corporate stiffness.",
  aggressive_sales:
    "Tone: Aggressive sales — direct offers and urgency ONLY if briefing includes discounts/perks. Strong CTAs; action now.",
  funny:
    "Tone: Funny — light humor, playful asides, dad-joke level bike puns OK. Never mean-spirited; stay on-brand for a dealership.",
};

export function buildToneModifier(tone: MarketingTone): string {
  return TONE_MODIFIERS[tone];
}
