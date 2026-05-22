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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import type { Organization } from "@/types/database";
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
  Radio,
} from "lucide-react";

const eventViewItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard?view=calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard?view=list", label: "List", icon: List },
  { href: "/dashboard?view=analytics", label: "Analytics", icon: BarChart3 },
];

const operationsItems = [
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/ops-feed", label: "Ops Feed", icon: Radio },
];

const adminItems = [
  { href: "/admin/users", label: "User Management", icon: ShieldCheck },
];

function sidebarNavItemClass(isActive: boolean) {
  return cn(
    "relative rounded-lg px-3 py-2.5 text-sm font-medium transition-[color,background-color,box-shadow] duration-150",
    isActive
      ? "bg-harley-orange/[0.11] text-harley-text shadow-[inset_0_0_0_1px_rgb(255_102_0/0.18)] before:absolute before:left-0 before:top-1/2 before:h-8 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-harley-orange"
      : "text-harley-text-muted hover:bg-surface-raised/72 hover:text-harley-text"
  );
}

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

/** Matches seeded `Milwaukee Harley-Davidson` (hyphen spelling) — not West Bend etc. */
function isMilwaukeeHarleyOrganization(org: Organization | null): boolean {
  const name = org?.name?.trim().toLowerCase() ?? "";
  return name.startsWith("milwaukee");
}

function SidebarDealershipSwitcher() {
  const { currentOrganization, memberships } = useCurrentOrganization();
  const otherDealerships = memberships.filter(
    (o) => o.id !== currentOrganization?.id
  );

  if (memberships.length === 0) {
    return null;
  }

  return (
    <div className="mx-3 rounded-xl border border-border-subtle bg-surface-base/45 p-3 shadow-[var(--shadow-card)] backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-harley-text-muted">
        Active dealership
      </p>
      <p
        className="mt-1 truncate text-sm font-semibold text-harley-text"
        title={currentOrganization?.name ?? undefined}
      >
        {currentOrganization?.name ?? "No dealership"}
      </p>
      {otherDealerships.length > 0 ? (
        <div className="mt-3 space-y-1">
          {otherDealerships.map((org) => (
            <form key={org.id} action={switchOrganization}>
              <input type="hidden" name="organizationId" value={org.id} />
              <button
                type="submit"
                className="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-harley-text-muted transition-colors duration-100 hover:bg-surface-raised/85 hover:text-harley-orange"
              >
                {org.name}
              </button>
            </form>
          ))}
        </div>
      ) : null}
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
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-2">
      <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-harley-text-muted">
        Event views
      </p>
      {eventViewItems.map((item) => {
        const isActive = isNavItemActive(pathname, searchParams, item.href);
        return (
          <SidebarNavLink
            key={item.href}
            href={item.href}
            onClick={onClose}
            icon={item.icon}
            label={item.label}
            className={sidebarNavItemClass(isActive)}
          />
        );
      })}
      <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-harley-text-muted">
        Operations
      </p>
      {operationsItems.map((item) => {
        const isActive = isNavItemActive(pathname, searchParams, item.href);
        return (
          <SidebarNavLink
            key={item.href}
            href={item.href}
            onClick={onClose}
            icon={item.icon}
            label={item.label}
            className={sidebarNavItemClass(isActive)}
          />
        );
      })}
      {canManageEvents && (
        <SidebarNavLink
          href="/vendors"
          onClick={onClose}
          icon={Store}
          label="Vendors"
          className={sidebarNavItemClass(
            pathname === "/vendors" || pathname.startsWith("/vendors/")
          )}
        />
      )}
      {isAdmin && (
        <>
          <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-harley-text-muted">
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
                className={sidebarNavItemClass(isActive)}
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
  const { currentOrganization } = useCurrentOrganization();
  const showMkeLogo = isMilwaukeeHarleyOrganization(currentOrganization);

  return (
    <>
      {mobileOpen && (
        <div
          data-sidebar-overlay
          className="print:hidden lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        data-app-sidebar
        className={cn(
          "print:hidden fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full transform flex-col border-r border-border-subtle bg-surface-overlay/95 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0",
          mobileOpen && "translate-x-0"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-5">
          <SidebarLogoLink onClick={onClose} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-harley-text-muted transition-colors hover:bg-surface-raised hover:text-harley-text lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {(showMkeLogo || canManageEvents) && (
          <div className="space-y-4 px-3 pb-2 pt-5">
            {showMkeLogo && (
              <div className="flex justify-center px-1">
                <img
                  src="/MKElogo.png"
                  alt="Milwaukee Harley-Davidson"
                  className="mx-auto h-auto max-h-[4.25rem] w-full max-w-[13rem] object-contain"
                  width={208}
                  height={68}
                  decoding="async"
                />
              </div>
            )}
            {canManageEvents ? (
              <SidebarNavLink
                href="/events/new"
                onClick={onClose}
                icon={PlusCircle}
                label="New Event"
                className={`${buttonStyles.primary("md")} w-full`}
              />
            ) : null}
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <Suspense
            fallback={
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pt-2">
                <Skeleton className="h-4 w-20" />
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-9 rounded-lg" />
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

        <div className="mt-auto shrink-0 space-y-3 border-t border-border-subtle pb-4 pt-3">
          <SidebarDealershipSwitcher />
          <p className="px-5 text-center text-[10px] text-harley-text-muted/50">
            Harley Event Dashboard v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
