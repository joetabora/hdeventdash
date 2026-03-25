"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Menu, ChevronDown, LogOut, User } from "lucide-react";

interface TopHeaderProps {
  onMenuToggle: () => void;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Events Dashboard",
  "/events/new": "Create New Event",
  "/admin/users": "User Management",
};

export function TopHeader({ onMenuToggle }: TopHeaderProps) {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const title =
    pageTitles[pathname] ||
    (pathname.startsWith("/events/") ? "Event Details" : "Dashboard");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <header className="sticky top-0 z-20 h-16 bg-harley-dark/70 backdrop-blur-xl border-b border-harley-gray/50 flex items-center justify-between px-4 lg:px-8">
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
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-harley-gray transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-harley-orange/20 flex items-center justify-center">
            <span className="text-sm font-semibold text-harley-orange">
              {email ? email.charAt(0).toUpperCase() : "?"}
            </span>
          </div>
          <span className="text-sm text-harley-text hidden sm:block max-w-[150px] truncate">
            {email || "Loading..."}
          </span>
          <ChevronDown className="w-4 h-4 text-harley-text-muted" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-56 bg-harley-dark rounded-xl border border-harley-gray-lighter/30 shadow-[0_8px_30px_rgba(0,0,0,0.4)] z-20 py-1">
              <div className="px-4 py-3 border-b border-harley-gray">
                <p className="text-xs text-harley-text-muted">Signed in as</p>
                <p className="text-sm text-harley-text font-medium truncate">
                  {email}
                </p>
              </div>
              <button
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
