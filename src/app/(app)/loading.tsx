import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown during client navigations between (app) routes while the server
 * renders the next page. Makes clicks feel acknowledged immediately.
 */
export default function AppRouteLoading() {
  return (
    <div className="space-y-8 animate-page-in" aria-busy="true" aria-label="Loading page">
      <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-overlay/70 p-4 shadow-[var(--shadow-card)] sm:p-5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 max-w-xs" />
        <Skeleton className="h-10 max-w-2xl rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[5.75rem]" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
