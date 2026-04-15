import { Loader2 } from "lucide-react";

/**
 * Shown during client navigations between (app) routes while the server
 * renders the next page. Makes clicks feel acknowledged immediately.
 */
export default function AppRouteLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-harley-text-muted"
      aria-busy="true"
      aria-label="Loading page"
    >
      <Loader2 className="h-9 w-9 animate-spin text-harley-orange" />
      <p className="text-sm font-medium text-harley-text-muted">Loading…</p>
    </div>
  );
}
