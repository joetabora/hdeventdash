/**
 * Routes that render an in-page {@link PageHeader} (or equivalent primary title).
 * Top chrome omits the duplicate route title for these paths.
 */
export function shouldSuppressTopHeaderTitle(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  if (pathname === "/budget") return true;
  if (pathname === "/ops-feed") return true;
  if (pathname === "/vendors" || pathname.startsWith("/vendors/")) return true;
  if (pathname === "/admin/users") return true;
  if (pathname === "/events/new") return true;
  if (/^\/events\/[^/]+\/notes$/.test(pathname)) return true;
  if (/^\/events\/[^/]+\/report$/.test(pathname)) return true;
  if (/^\/events\/[^/]+$/.test(pathname)) return true;
  return false;
}
