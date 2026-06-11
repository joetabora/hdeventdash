import type { Event } from "@/types/database";

/** RFC 5545 text escaping for SUMMARY/LOCATION/DESCRIPTION values. */
function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets (continuation lines start with a space). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function ymdToCompact(date: string): string {
  return date.replace(/-/g, "");
}

/** Day after a YYYY-MM-DD date in compact form (all-day DTEND is exclusive). */
function nextDayCompact(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * iCalendar document of events as all-day entries (event times are free-text
 * display fields, so they are included in the description instead of parsed).
 */
export function eventsToIcs(events: Event[], appBaseUrl: string): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Harley Event Dashboard//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine("X-WR-CALNAME:Dealership Events"),
  ];

  for (const event of events) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) continue;

    const descriptionParts: string[] = [];
    const times = [event.event_time_start, event.event_time_end]
      .filter((t) => t && String(t).trim() !== "")
      .join(" – ");
    if (times) descriptionParts.push(`Time: ${times}`);
    if (event.description) descriptionParts.push(event.description);
    if (appBaseUrl) descriptionParts.push(`${appBaseUrl}/events/${event.id}`);

    lines.push(
      "BEGIN:VEVENT",
      foldLine(`UID:${event.id}@harley-event-dashboard`),
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${ymdToCompact(event.date)}`,
      `DTEND;VALUE=DATE:${nextDayCompact(event.date)}`,
      foldLine(`SUMMARY:${icsEscape(event.name)}`)
    );
    if (event.location) {
      lines.push(foldLine(`LOCATION:${icsEscape(event.location)}`));
    }
    if (descriptionParts.length > 0) {
      lines.push(
        foldLine(`DESCRIPTION:${icsEscape(descriptionParts.join("\n"))}`)
      );
    }
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
