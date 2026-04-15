"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { LucideIcon } from "lucide-react";
import { Loader2, Zap } from "lucide-react";

function NavLinkRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin text-harley-orange"
          aria-hidden
        />
      ) : (
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span className={`min-w-0 flex-1 truncate ${pending ? "opacity-80" : ""}`}>
        {label}
      </span>
    </>
  );
}

type SidebarNavLinkProps = {
  href: string;
  onClick?: () => void;
  className: string;
  icon: LucideIcon;
  label: string;
};

/**
 * Sidebar row: children must include a subtree that calls `useLinkStatus`
 * (here {@link NavLinkRow}) so pending state reflects App Router navigations.
 */
export function SidebarNavLink({
  href,
  onClick,
  className,
  icon,
  label,
}: SidebarNavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      prefetch
      className={`flex items-center gap-2 ${className}`}
    >
      <NavLinkRow icon={icon} label={label} />
    </Link>
  );
}

function BrandRow() {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <Loader2 className="h-6 w-6 shrink-0 animate-spin text-harley-orange" />
      ) : (
        <Zap className="h-6 w-6 shrink-0 text-harley-orange" aria-hidden />
      )}
      <span
        className={`text-lg font-bold text-harley-text tracking-tight ${pending ? "opacity-80" : ""}`}
      >
        Harley Events
      </span>
    </>
  );
}

export function SidebarLogoLink({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/dashboard"
      onClick={onClick}
      prefetch
      className="flex items-center gap-2.5"
    >
      <BrandRow />
    </Link>
  );
}
