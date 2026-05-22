"use client";

import { useState, Suspense } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Menu, ChevronDown, LogOut, Building2 } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/contexts/current-organization-context";
import { cn } from "@/lib/cn";
import { shouldSuppressTopHeaderTitle } from "@/lib/navigation-chrome";

interface TopHeaderProps {
  onMenuToggle: () => void;
  userEmail: string | null;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Events Dashboard",
  "/budget": "Budget",
  "/events/new": "Create New Event",
  "/vendors": "Vendors",
  "/admin/users": "User Management",
};

function TopHeaderInner({ onMenuToggle, userEmail }: TopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentOrganization } = useCurrentOrganization();

  const dashboardView =
    pathname === "/dashboard" ? searchParams.get("view") : null;
  const title =
    dashboardView === "analytics"
      ? "Analytics"
      : pageTitles[pathname] ||
        (pathname.startsWith("/events/")
          ? "Event Details"
          : pathname.startsWith("/vendors/")
            ? "Vendor Details"
            : "Dashboard");

  const suppressTitle = shouldSuppressTopHeaderTitle(pathname);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  return (
    <header
      className={cn(
        "print:hidden sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border-subtle",
        "bg-harley-black/70 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-harley-black/45 lg:px-8"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          data-menu-toggle
          onClick={onMenuToggle}
          className="-ml-2 rounded-lg p-2 text-harley-text-muted transition-colors hover:bg-surface-raised hover:text-harley-text lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {!suppressTitle ? (
              <h1 className="font-display-heading text-base font-semibold tracking-tight text-harley-text sm:text-lg">
                {title}
              </h1>
            ) : null}
            {currentOrganization?.name ? (
              <span
                className="inline-flex max-w-[min(14rem,calc(100vw-10rem))] items-center gap-1.5 truncate rounded-md border border-border-subtle bg-surface-overlay/88 px-2 py-0.5 text-xs font-medium text-harley-text-muted"
                title={currentOrganization.name}
              >
                <Building2 className="h-3 w-3 shrink-0 text-harley-orange" />
                {currentOrganization.name}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-xl border border-transparent px-1.5 py-1 transition-colors hover:border-border-subtle hover:bg-surface-overlay/72 sm:px-2 sm:py-1.5"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-harley-orange/25 bg-harley-orange/12 shadow-[inset_0_1px_0_rgb(255_255_255/0.05)] ring-2 ring-transparent transition-[border-color] hover:border-harley-orange/40">
            <span className="text-sm font-semibold text-harley-orange tabular-nums">
              {userEmail ? userEmail.charAt(0).toUpperCase() : "?"}
            </span>
          </span>
          <span className="hidden max-w-[150px] truncate text-sm text-harley-text sm:block">
            {userEmail ?? "—"}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-harley-text-muted transition-transform",
              menuOpen && "rotate-180"
            )}
          />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              aria-hidden
              onClick={() => setMenuOpen(false)}
            />
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border-subtle bg-surface-overlay/96 py-1 shadow-[var(--shadow-elevated)] backdrop-blur-xl"
            >
              <div className="border-b border-border-subtle px-4 py-3">
                <p className="text-xs text-harley-text-muted">Signed in as</p>
                <p className="truncate text-sm font-medium text-harley-text">
                  {userEmail ?? "—"}
                </p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-harley-text-muted transition-colors hover:bg-surface-raised hover:text-harley-text"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export function TopHeader(props: TopHeaderProps) {
  return (
    <Suspense
      fallback={
        <header
          className={cn(
            "print:hidden sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border-subtle px-4 backdrop-blur-xl lg:px-8",
            "bg-harley-black/70 supports-[backdrop-filter]:bg-harley-black/45"
          )}
        >
          <h1 className="font-display-heading text-lg font-semibold text-harley-text">
            Dashboard
          </h1>
        </header>
      }
    >
      <TopHeaderInner {...props} />
    </Suspense>
  );
}
