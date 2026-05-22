"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { cn } from "@/lib/cn";

const PushNotificationPrompt = dynamic(
  () =>
    import("@/components/push/push-notification-prompt").then((m) => ({
      default: m.PushNotificationPrompt,
    })),
  { ssr: false }
);

/**
 * Interactive app chrome: mobile sidebar state, nav, header, user menu.
 * Server routes render as `children` inside `<main>` (RSC composition).
 */
export function AppChrome({
  children,
  userEmail,
  activeOrganizationId,
}: {
  children: React.ReactNode;
  userEmail: string | null;
  /** When the dealership changes, remount page clients so `useState(initial…)` cannot show the prior org. */
  activeOrganizationId: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div
        id="app-shell-main"
        className="relative z-[1] flex min-h-screen flex-col lg:pl-64"
      >
        <TopHeader
          onMenuToggle={() => setMobileOpen((v) => !v)}
          userEmail={userEmail}
        />
        <PushNotificationPrompt />

        <main
          className={cn(
            "relative flex-1 overflow-y-auto",
            "bg-[linear-gradient(180deg,rgb(255_102_0/0.04)_0%,transparent_13rem)]"
          )}
        >
          <div
            id="app-shell-scroll-inner"
            key={activeOrganizationId ?? "no-org"}
            className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 lg:px-8 lg:py-10"
          >
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
