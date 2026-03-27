"use client";

import { useState, Suspense } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Menu, ChevronDown, LogOut } from "lucide-react";

interface TopHeaderProps {
  onMenuToggle: () => void;
  userEmail: string | null;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Events Dashboard",
  "/events/new": "Create New Event",
  "/admin/users": "User Management",
};

function TopHeaderInner({ onMenuToggle, userEmail }: TopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);

  const dashboardView = pathname === "/dashboard" ? searchParams.get("view") : null;
  const title =
    dashboardView === "analytics"
      ? "Analytics"
      : pageTitles[pathname] ||
        (pathname.startsWith("/events/") ? "Event Details" : "Dashboard");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  return (
    <header className="sticky top-0 z-20 h-16 bg-harley-dark/90 backdrop-blur-xl border-b border-harley-gray flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-menu-toggle
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-2 rounded-lg text-harley-text-muted hover:bg-harley-gray hover:text-harley-text transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-harley-text">{title}</h1>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-harley-gray transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-harley-orange/20 flex items-center justify-center">
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
            <div className="absolute right-0 mt-2 w-56 bg-harley-dark rounded-xl border border-harley-gray shadow-[0_8px_24px_rgba(0,0,0,0.55)] z-20 py-1">
              <div className="px-4 py-3 border-b border-harley-gray">
                <p className="text-xs text-harley-text-muted">Signed in as</p>
                <p className="text-sm text-harley-text font-medium truncate">
                  {userEmail ?? "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-harley-text-muted hover:bg-harley-gray hover:text-harley-text transition-colors"
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
        <header className="sticky top-0 z-20 h-16 bg-harley-dark/90 backdrop-blur-xl border-b border-harley-gray flex items-center justify-between px-4 lg:px-8">
          <h1 className="text-lg font-semibold text-harley-text">Dashboard</h1>
        </header>
      }
    >
      <TopHeaderInner {...props} />
    </Suspense>
  );
}
