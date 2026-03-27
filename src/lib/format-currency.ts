/** Shared USD formatting for dashboard, events, ROI, and budgets. */

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

/**
 * Currency display for nullable DB amounts (planned/actual budget, etc.).
 * Uses detailed cents by default; use `variant: "compact"` for whole-dollar style.
 */
export function formatUsdNullable(
  value: number | null | undefined,
  options?: { variant?: "compact" | "detailed" }
): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  const variant = options?.variant ?? "detailed";
  return variant === "compact" ? formatUsd(n) : formatUsdDetailed(n);
}
