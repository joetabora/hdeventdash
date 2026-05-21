import type { MarketingPlatform } from "./types";
import { SEO_PLATFORMS } from "./constants";

export function buildSeoModifier(platform: MarketingPlatform, moreSeoFocus: boolean): string {
  const applies = SEO_PLATFORMS.includes(platform) || moreSeoFocus;
  if (!applies) {
    return moreSeoFocus
      ? "SEO hint: weave natural local keywords (city, dealership, motorcycle event) without stuffing."
      : "";
  }

  return [
    "SEO guidelines:",
    "- Primary keyword near the start of titles and first paragraph when natural.",
    "- Include semantic variants: motorcycle event, Harley-Davidson, ride, open house, Milwaukee/local city from briefing.",
    "- Write for humans first; search engines second.",
    "- Meta title ~50–60 characters; meta description 140–155 characters.",
    "- Avoid keyword stuffing, duplicate boilerplate, and unverifiable superlatives (#1, best ever).",
    "- Match search intent: people looking for local events, rides, dealership happenings.",
    moreSeoFocus
      ? "- Extra SEO focus: prioritize discoverability and clear location + date signals."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
