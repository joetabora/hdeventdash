import type { Event } from "@/types/database";

/** Canonical string fields merged into AI templates for an {@link Event}. */
export function eventToAiTemplateVars(event: Event): Record<string, string> {
  const loc = event.location?.trim() || "our venue";
  const desc = (event.description ?? "").trim() || event.name;
  const dateStr = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const shortDate = new Date(event.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return {
    eventName: event.name,
    eventDateFormatted: dateStr,
    eventDateShort: shortDate,
    eventLocation: loc,
    eventDescription: desc,
    eventOwner: event.owner ?? "",
  };
}

/** Server-trusted fields override client-supplied keys with the same names. */
export function mergeClientVarsWithEvent(
  event: Event,
  clientVars: Record<string, unknown>
): Record<string, unknown> {
  return { ...clientVars, ...eventToAiTemplateVars(event) };
}
