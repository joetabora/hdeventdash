"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  LayoutGrid,
  Calendar,
  List,
  PlusCircle,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Kanban", icon: LayoutGrid },
  { href: "/dashboard?view=calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard?view=list", label: "List", icon: List },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-harley-dark/80 backdrop-blur-xl border-r border-harley-gray/60 flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-harley-gray/60 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
            onClick={onClose}
          >
            <Zap className="w-6 h-6 text-harley-orange" />
            <span className="text-lg font-bold text-harley-text tracking-tight">
              Harley Events
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-harley-text-muted hover:text-harley-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Event */}
        <div className="px-4 pt-5 pb-2">
          <Link
            href="/events/new"
            onClick={onClose}
            className="flex items-center gap-2 w-full px-4 py-2.5 bg-harley-orange text-white rounded-lg font-medium hover:bg-harley-orange-light transition-colors text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            New Event
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 pt-2 space-y-1 overflow-y-auto">
          <p className="px-3 pt-3 pb-2 text-[10px] font-semibold text-harley-text-muted uppercase tracking-widest">
            Views
          </p>
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" &&
                  (typeof window === "undefined" ||
                    !new URLSearchParams(window.location.search).has("view"))
                : typeof window !== "undefined" &&
                  window.location.href.includes(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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

        {/* Footer */}
        <div className="px-5 py-4 border-t border-harley-gray/60">
          <p className="text-[10px] text-harley-text-muted/50 text-center">
            Harley Event Dashboard v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
