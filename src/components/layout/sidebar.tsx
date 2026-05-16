"use client";

import { Suspense } from "react";
import {
  usePathname,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import { switchOrganization } from "@/app/actions/switch-organization-action";
import { useAppRole } from "@/contexts/app-role-context";
import { useCurrentOrganization } from "@/contexts/current-organization-context";
import { buttonStyles } from "@/components/ui/button";
import {
  SidebarLogoLink,
  SidebarNavLink,
} from "@/components/layout/sidebar-nav-link";
import {
  LayoutGrid,
  Calendar,
  List,
  BarChart3,
  PlusCircle,
  X,
  ShieldCheck,
  Store,
  Wallet,
} from "lucide-react";

const navItems = [
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/dashboard", label: "Kanban", icon: LayoutGrid },
  { href: "/dashboard?view=calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard?view=list", label: "List", icon: List },
  { href: "/dashboard?view=analytics", label: "Analytics", icon: BarChart3 },
];

const adminItems = [
  { href: "/admin/users", label: "User Management", icon: ShieldCheck },
];

function isNavItemActive(
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  href: string
): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" && searchParams.get("view") == null;
  }
  const q = href.indexOf("?");
  const path = q === -1 ? href : href.slice(0, q);
  if (pathname !== path) return false;
  if (q === -1) return true;
  const want = new URLSearchParams(href.slice(q + 1));
  for (const [k, v] of want) {
    if (searchParams.get(k) !== v) return false;
  }
  return true;
}

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function SidebarDealershipSwitcher() {
  const { currentOrganization, memberships } = useCurrentOrganization();
  const otherDealerships = memberships.filter(
    (o) => o.id !== currentOrganization?.id
  );

  if (memberships.length < 2 || otherDealerships.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5 shrink-0">
      <p className="text-[10px] font-semibold text-harley-text-muted uppercase tracking-widest px-5">
        Switch dealership
      </p>
      <div className="px-2 space-y-0.5">
        {otherDealerships.map((org) => (
          <form key={org.id} action={switchOrganization}>
            <input type="hidden" name="organizationId" value={org.id} />
            <button
              type="submit"
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-harley-text-muted hover:bg-harley-gray-light/30 hover:text-harley-orange transition-colors duration-100"
            >
              {org.name}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

function SidebarNav({
  onClose,
  canManageEvents,
  isAdmin,
}: {
  onClose: () => void;
  canManageEvents: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className="flex-1 px-4 pt-2 space-y-1 overflow-y-auto">
      <p className="px-3 pt-3 pb-2 text-[10px] font-semibold text-harley-text-muted uppercase tracking-widest">
        Views
      </p>
      {navItems.map((item) => {
        const isActive = isNavItemActive(pathname, searchParams, item.href);
        return (
          <SidebarNavLink
            key={item.href}
            href={item.href}
            onClick={onClose}
            icon={item.icon}
            label={item.label}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-100 ${
              isActive
                ? "bg-harley-orange/15 text-harley-orange"
                : "text-harley-text-muted hover:bg-harley-gray-light/30 hover:text-harley-text"
            }`}
          />
        );
      })}
      {canManageEvents && (
        <SidebarNavLink
          href="/vendors"
          onClick={onClose}
          icon={Store}
          label="Vendors"
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-100 ${
            pathname === "/vendors" || pathname.startsWith("/vendors/")
              ? "bg-harley-orange/15 text-harley-orange"
              : "text-harley-text-muted hover:bg-harley-gray-light/30 hover:text-harley-text"
          }`}
        />
      )}
      {isAdmin && (
        <>
          <p className="px-3 pt-5 pb-2 text-[10px] font-semibold text-harley-text-muted uppercase tracking-widest">
            Admin
          </p>
          {adminItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SidebarNavLink
                key={item.href}
                href={item.href}
                onClick={onClose}
                icon={item.icon}
                label={item.label}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-100 ${
                  isActive
                    ? "bg-harley-orange/15 text-harley-orange"
                    : "text-harley-text-muted hover:bg-harley-gray-light/30 hover:text-harley-text"
                }`}
              />
            );
          })}
        </>
      )}
    </nav>
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { isAdmin, canManageEvents } = useAppRole();

  return (
    <>
      {mobileOpen && (
        <div
          data-sidebar-overlay
          className="print:hidden lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        data-app-sidebar
        className={`print:hidden fixed inset-y-0 left-0 z-40 w-64 bg-harley-dark backdrop-blur-xl border-r border-harley-gray flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-harley-gray shrink-0">
          <SidebarLogoLink onClick={onClose} />
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-harley-text-muted hover:text-harley-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {canManageEvents && (
          <div className="px-4 pt-5 pb-2">
            <SidebarNavLink
              href="/events/new"
              onClick={onClose}
              icon={PlusCircle}
              label="New Event"
              className={`${buttonStyles.primary("md")} w-full`}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <Suspense
            fallback={
              <div className="flex-1 px-4 pt-2 space-y-2 overflow-y-auto min-h-0">
                <div className="h-4 w-20 rounded bg-harley-gray/40 animate-pulse" />
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-9 rounded-lg bg-harley-gray/25 animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <SidebarNav
              onClose={onClose}
              canManageEvents={canManageEvents}
              isAdmin={isAdmin}
            />
          </Suspense>
        </div>

        <div className="mt-auto shrink-0 border-t border-harley-gray pt-3 pb-4 space-y-3">
          <SidebarDealershipSwitcher />
          <p className="px-5 text-[10px] text-harley-text-muted/50 text-center">
            Harley Event Dashboard v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
