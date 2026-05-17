"use client";

import { useState, Suspense } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/contexts/current-organization-context";
import { Menu, ChevronDown, LogOut, Building2 } from "lucide-react";

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

  const dashboardView = pathname === "/dashboard" ? searchParams.get("view") : null;
  const title =
    dashboardView === "analytics"
      ? "Analytics"
      : pageTitles[pathname] ||
        (pathname.startsWith("/events/") ? "Event Details"
        : pathname.startsWith("/vendors/") ? "Vendor Details"
        : "Dashboard");

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  return (
    <header className="print:hidden sticky top-0 z-20 h-16 border-b border-harley-gray/80 bg-harley-black/78 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-menu-toggle
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-2 rounded-lg text-harley-text-muted hover:bg-harley-gray-light hover:text-harley-text transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col min-w-0 gap-0.5">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-harley-text">{title}</h1>
            {currentOrganization?.name ? (
              <span
                className="inline-flex max-w-[min(14rem,calc(100vw-10rem))] items-center gap-1.5 truncate rounded-md border border-harley-gray/80 bg-harley-dark/80 px-2 py-0.5 text-xs font-medium text-harley-text-muted"
                title={currentOrganization.name}
              >
                <Building2 className="h-3 w-3 shrink-0 text-harley-orange" />
                {currentOrganization.name}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-harley-gray/80 hover:bg-harley-dark/80 sm:px-3"
        >
          <div className="w-8 h-8 rounded-md bg-harley-orange/14 border border-harley-orange/20 flex items-center justify-center">
            <span className="text-sm font-semibold text-harley-orange">
              {userEmail ? userEmail.charAt(0).toUpperCase() : "?"}
            </span>
          </div>
          <span className="text-sm text-harley-text hidden sm:block max-w-[150px] truncate">
            {userEmail ?? "—"}
          </span>
          <ChevronDown className="w-4 h-4 text-harley-text-muted" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-harley-gray/80 bg-harley-dark shadow-[var(--shadow-elevated)] z-20 py-1">
              <div className="px-4 py-3 border-b border-harley-gray/80">
                <p className="text-xs text-harley-text-muted">Signed in as</p>
                <p className="text-sm text-harley-text font-medium truncate">
                  {userEmail ?? "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-harley-text-muted hover:bg-harley-gray-light hover:text-harley-text transition-colors"
              >
                <LogOut className="w-4 h-4" />
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
        <header className="print:hidden sticky top-0 z-20 h-16 border-b border-harley-gray/80 bg-harley-black/78 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8">
          <h1 className="text-lg font-semibold text-harley-text">Dashboard</h1>
        </header>
      }
    >
      <TopHeaderInner {...props} />
    </Suspense>
  );
}
