import { format, isToday, isYesterday, parseISO } from "date-fns";
import type { Event, OpsFeedEntryWithEvent } from "@/types/database";

export function enrichOpsFeedEntry(
  entry: OpsFeedEntryWithEvent,
  events: Event[]
): OpsFeedEntryWithEvent {
  if (!entry.event_id) return { ...entry, event: null };
  const hit = events.find((e) => e.id === entry.event_id);
  if (!hit) return { ...entry, event: null };
  return {
    ...entry,
    event: { id: hit.id, name: hit.name, date: hit.date },
  };
}

export function enrichOpsFeedEntries(
  entries: OpsFeedEntryWithEvent[],
  events: Event[]
): OpsFeedEntryWithEvent[] {
  return entries.map((e) => enrichOpsFeedEntry(e, events));
}

export function opsFeedDayLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d, yyyy");
}

export function groupOpsFeedByDay(
  entries: OpsFeedEntryWithEvent[]
): { dayKey: string; label: string; entries: OpsFeedEntryWithEvent[] }[] {
  const map = new Map<string, OpsFeedEntryWithEvent[]>();
  for (const entry of entries) {
    const dayKey = format(parseISO(entry.created_at), "yyyy-MM-dd");
    const list = map.get(dayKey) ?? [];
    list.push(entry);
    map.set(dayKey, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, dayEntries]) => ({
      dayKey,
      label: opsFeedDayLabel(dayEntries[0]!.created_at),
      entries: dayEntries,
    }));
}

export function parseTagsInput(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,#]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    ),
  ].slice(0, 20);
}

export function formatTagsInput(tags: string[]): string {
  return tags.join(", ");
}
