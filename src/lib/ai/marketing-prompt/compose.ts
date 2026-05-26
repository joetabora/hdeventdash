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

const MARKETING_OLLAMA_TOP_P = 0.9;
const MARKETING_OLLAMA_REPEAT_PENALTY = 1.1;

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

/** Keep marketing generations within proxy-safe limits while allowing richer FB copy. */
export function resolveMarketingNumPredict(input: MarketingPromptInput): number {
  const { platform, copyLength, variationCount, options } = input;

  let base =
    copyLength === "short" ? 448 : copyLength === "long" ? 992 : 768;

  if (platform === "facebook_post") {
    base =
      copyLength === "short" ? 512 : copyLength === "long" ? 1280 : 1024;
  }

  if (options.shorterCopy) {
    base = Math.min(base, platform === "facebook_post" ? 512 : 384);
  }
  if (options.longerCopy) {
    base = Math.min(base + 256, 1408);
  }
  const variationBoost = (variationCount - 1) * 192;
  const packBoost = platform === "full_copy_pack" ? 512 : 0;
  return Math.min(1536, base + variationBoost + packBoost);
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
    buildLengthModifier(input.copyLength, input.options, input.platform),
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
    numPredict: resolveMarketingNumPredict(input),
    topP: MARKETING_OLLAMA_TOP_P,
    repeatPenalty: MARKETING_OLLAMA_REPEAT_PENALTY,
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
