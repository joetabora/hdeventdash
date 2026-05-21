import type { MarketingPlatform, MarketingPromptInput, ComposedMarketingPrompt } from "./types";
import { SEO_PLATFORMS, SOCIAL_PLATFORMS } from "./constants";
import { buildBaseSystemPrompt } from "./base-prompt";
import { buildDealershipVoiceModifier } from "./dealership-voice";
import { buildPlatformModifier, buildPlatformOutputLabel } from "./platform-modifiers";
import { buildToneModifier } from "./tone-modifiers";
import { buildSeoModifier } from "./seo-modifier";
import {
  buildToggleModifiers,
  buildLengthModifier,
} from "./toggle-modifiers";

function buildVariationInstructions(count: 1 | 2 | 3): string {
  if (count === 1) {
    return "Produce ONE final version of the requested copy.";
  }
  const labels = Array.from({ length: count }, (_, i) => `VARIATION_${i + 1}:`).join("\n");
  return [
    `Produce exactly ${count} distinct variations with noticeably different hooks/angles.`,
    "Separate each with this exact label on its own line:",
    labels,
    "Each variation must fully satisfy the platform format.",
  ].join("\n");
}

/** Resolve Ollama temperature from platform + toggles (social higher, SEO lower). */
export function resolveMarketingTemperature(input: MarketingPromptInput): number {
  const isSeoHeavy =
    SEO_PLATFORMS.includes(input.platform) && input.platform !== "full_copy_pack";
  const isSocial = SOCIAL_PLATFORMS.includes(input.platform);

  if (isSeoHeavy || input.options.moreSeoFocus) {
    if (input.options.moreHype || input.tone === "hype" || input.tone === "high_energy") {
      return 0.65;
    }
    return 0.55;
  }

  if (isSocial || input.platform === "full_copy_pack") {
    if (input.tone === "professional" || input.options.moreProfessional) {
      return 0.75;
    }
    if (input.tone === "funny" || input.tone === "hype" || input.options.moreHype) {
      return 0.95;
    }
    return 0.85;
  }

  return 0.8;
}

export function composeMarketingPrompt(
  input: MarketingPromptInput
): ComposedMarketingPrompt {
  const systemParts = [
    buildBaseSystemPrompt(),
    buildDealershipVoiceModifier(),
    buildToneModifier(input.tone),
    buildPlatformModifier(input.platform),
    buildSeoModifier(input.platform, input.options.moreSeoFocus),
    buildToggleModifiers(input.options),
    buildLengthModifier(input.copyLength, input.options),
  ].filter(Boolean);

  const userParts = [
    buildVariationInstructions(input.variationCount),
    buildPlatformOutputLabel(input.platform),
    "",
    "Event briefing (facts — do not contradict):",
    "---",
    input.briefing.trim(),
    "---",
  ];

  return {
    system: systemParts.join("\n\n"),
    user: userParts.join("\n"),
    temperature: resolveMarketingTemperature(input),
  };
}

/** Improved legacy full-pack sections (used when platform is full_copy_pack). */
export function composeLegacyCopyPackPrompt(briefing: string): ComposedMarketingPrompt {
  return composeMarketingPrompt({
    briefing,
    platform: "full_copy_pack",
    tone: "hype",
    copyLength: "standard",
    variationCount: 1,
    options: {
      moreEmojis: true,
      moreSeoFocus: true,
      moreEngagement: true,
      shorterCopy: false,
      longerCopy: false,
      strongerCta: true,
      moreProfessional: false,
      moreHype: true,
    },
  });
}

export type { MarketingPlatform };
