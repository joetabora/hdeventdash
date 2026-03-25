"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Zap,
  LayoutGrid,
  Calendar,
  List,
  PlusCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Kanban", icon: LayoutGrid },
  { href: "/dashboard?view=calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard?view=list", label: "List", icon: List },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const navContent = (
    <>
      <div className="px-4 py-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Zap className="w-7 h-7 text-harley-orange" />
          <span className="text-lg font-bold text-harley-text">
            Harley Events
          </span>
        </Link>
      </div>

      <div className="px-3 mb-4">
        <Link
          href="/events/new"
          className="flex items-center gap-2 w-full px-4 py-2.5 bg-harley-orange text-white rounded-lg font-medium hover:bg-harley-orange-light transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Event
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard" &&
                !new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").has("view")
              : typeof window !== "undefined" && window.location.href.includes(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-harley-orange/15 text-harley-orange"
                  : "text-harley-text-muted hover:bg-harley-gray hover:text-harley-text"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-harley-gray">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-harley-text-muted hover:bg-harley-gray hover:text-harley-text transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-harley-dark rounded-lg border border-harley-gray"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? (
          <X className="w-5 h-5 text-harley-text" />
        ) : (
          <Menu className="w-5 h-5 text-harley-text" />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-harley-dark border-r border-harley-gray flex flex-col transform transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
