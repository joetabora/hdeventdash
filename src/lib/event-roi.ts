import type { Event } from "@/types/database";

export type EventRoiFields = Pick<
  Event,
  | "roi_leads_generated"
  | "roi_bikes_sold"
  | "roi_service_revenue"
  | "roi_motorclothes_revenue"
  | "roi_bike_sales_revenue"
  | "roi_event_cost"
>;

function num(n: number | null | undefined): number {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 0;
  return Number(n);
}

/** Sum of revenue lines (service + motorclothes + bike sales $). */
export function totalRoiRevenue(e: EventRoiFields): number {
  return (
    num(e.roi_service_revenue) +
    num(e.roi_motorclothes_revenue) +
    num(e.roi_bike_sales_revenue)
  );
}

export function netRoiProfit(e: EventRoiFields): number {
  return totalRoiRevenue(e) - num(e.roi_event_cost);
}

/** Return on cost as percentage when cost > 0; otherwise null. */
export function roiPercentOnCost(e: EventRoiFields): number | null {
  const cost = num(e.roi_event_cost);
  if (cost <= 0) return null;
  return (netRoiProfit(e) / cost) * 100;
}

export function hasAnyRoiData(e: EventRoiFields): boolean {
  return (
    (e.roi_leads_generated != null && e.roi_leads_generated > 0) ||
    (e.roi_bikes_sold != null && e.roi_bikes_sold > 0) ||
    num(e.roi_service_revenue) > 0 ||
    num(e.roi_motorclothes_revenue) > 0 ||
    num(e.roi_bike_sales_revenue) > 0 ||
    num(e.roi_event_cost) > 0
  );
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatUsdDetailed(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** One-line answer for “did we make money?” */
export function roiMoneyVerdict(e: EventRoiFields): {
  label: string;
  tone: "success" | "danger" | "muted" | "warning";
} {
  const revenue = totalRoiRevenue(e);
  const cost = num(e.roi_event_cost);
  const net = netRoiProfit(e);

  if (revenue === 0 && cost === 0 && !hasAnyRoiData(e)) {
    return {
      label: "Add revenue and optional event cost to see if this event paid off.",
      tone: "muted",
    };
  }
  if (cost <= 0) {
    if (revenue > 0) {
      return {
        label: `Tracked ${formatUsd(revenue)} in revenue. Add event cost to estimate profit.`,
        tone: "warning",
      };
    }
    return { label: "Enter revenue or cost to evaluate this event.", tone: "muted" };
  }
  if (net > 0) {
    return {
      label: `Yes — about ${formatUsd(net)} ahead after estimated costs.`,
      tone: "success",
    };
  }
  if (net < 0) {
    return {
      label: `Likely no — about ${formatUsd(-net)} short of costs on paper.`,
      tone: "danger",
    };
  }
  return { label: "Roughly break-even vs estimated costs.", tone: "muted" };
}
