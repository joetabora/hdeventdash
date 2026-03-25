import { differenceInDays, parseISO } from "date-fns";

const AT_RISK_DAYS = 5;

export function isEventAtRisk(
  eventDate: string,
  eventStatus: string,
  totalItems: number,
  completedItems: number
): boolean {
  if (eventStatus === "completed" || eventStatus === "live_event") return false;
  if (totalItems === 0) return false;
  if (completedItems === totalItems) return false;

  const daysUntil = differenceInDays(parseISO(eventDate), new Date());
  return daysUntil >= 0 && daysUntil <= AT_RISK_DAYS;
}
