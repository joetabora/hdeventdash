import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { isEventAtRisk } from "@/lib/at-risk";

export type PushNotificationKind = "three_day" | "one_day" | "at_risk";

export interface EventRow {
  id: string;
  name: string;
  date: string;
  status: string;
  user_id: string;
}

export interface EvaluatedNotification {
  kind: PushNotificationKind;
  /** Dedup key stored in notification_sent */
  notificationKey: string;
  title: string;
  body: string;
}

/**
 * Returns notifications to send today for one event (may be empty).
 * Caller checks notification_sent before sending.
 */
export function evaluateEventNotifications(
  event: EventRow,
  totalChecklist: number,
  completedChecklist: number
): EvaluatedNotification[] {
  const out: EvaluatedNotification[] = [];
  const today = startOfDay(new Date());
  const eventDay = startOfDay(parseISO(event.date));
  const d = differenceInCalendarDays(eventDay, today);

  if (event.status === "completed" || event.status === "live_event") {
    return out;
  }

  const dateKey = event.date;

  if (d === 3) {
    out.push({
      kind: "three_day",
      notificationKey: `three_day:${event.id}:${dateKey}`,
      title: "Event in 3 days",
      body: `"${event.name}" is 3 days away — review the checklist.`,
    });
  }

  if (d === 1) {
    out.push({
      kind: "one_day",
      notificationKey: `one_day:${event.id}:${dateKey}`,
      title: "Event tomorrow",
      body: `"${event.name}" is tomorrow.`,
    });
  }

  const atRisk = isEventAtRisk(
    event.date,
    event.status,
    totalChecklist,
    completedChecklist
  );
  if (atRisk && d >= 0) {
    const dayStamp = format(today, "yyyy-MM-dd");
    out.push({
      kind: "at_risk",
      notificationKey: `at_risk:${event.id}:${dayStamp}`,
      title: "Event at risk",
      body: `"${event.name}" is soon and the checklist isn’t complete.`,
    });
  }

  return out;
}
