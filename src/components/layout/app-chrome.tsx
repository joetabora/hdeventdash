"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";

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
}: {
  children: React.ReactNode;
  userEmail: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div id="app-shell-main" className="lg:pl-64 flex flex-col min-h-screen">
        <TopHeader
          onMenuToggle={() => setMobileOpen((v) => !v)}
          userEmail={userEmail}
        />
        <PushNotificationPrompt />

        <main className="flex-1 overflow-y-auto">
          <div
            id="app-shell-scroll-inner"
            className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8"
          >
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
